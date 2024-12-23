import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import * as jsyaml from 'js-yaml';

type ComponentCategory = 'ingress' | 'egress' | 'security' | 'other';

interface ClusterInfo {
  name: string;
  ingressvip: string;
  ingressname: string;
  api: string;
}

interface ClusterConfig {
  clusters: {
    [key: string]: ClusterInfo[];
  };
}

interface ComponentOptions {
  ingress?: string[];
  egress?: string[];
  security?: string[];
  other?: string[];
  sections?: {
    base?: string[];
    combinations?: {
      [key: string]: string[];
    };
  };
}

interface DisplayRules {
  rules: {
    [key: string]: {
      [key: string]: ComponentOptions;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private displayRules: DisplayRules = {
    rules: {}
  };
  private clusterConfig: ClusterConfig = {
    clusters: {}
  };

  constructor(private http: HttpClient) {
    this.loadDisplayRules();
    this.loadClusterInfo();
  }

  async loadDisplayRules(): Promise<void> {
    try {
      const response = await this.http.get('/assets/config/display-rules.yaml', { responseType: 'text' }).toPromise();
      if (response) {
        this.displayRules = jsyaml.load(response) as DisplayRules;
      }
    } catch (error) {
      console.error('Error loading display rules:', error);
    }
  }

  async loadClusterInfo(): Promise<void> {
    try {
      const response = await this.http.get('/assets/config/cluster-info.yaml', { responseType: 'text' }).toPromise();
      if (response) {
        this.clusterConfig = jsyaml.load(response) as ClusterConfig;
      }
    } catch (error) {
      console.error('Error loading cluster info:', error);
    }
  }

  getComponentOptions(pattern: string, environment: string): Observable<ComponentOptions> {
    if (!pattern || !environment) {
      return new Observable(subscriber => {
        subscriber.next({});
        subscriber.complete();
      });
    }

    const rules = this.displayRules?.rules?.[pattern]?.[environment];
    return of(rules || {});
  }

  getClusterOptions(environment: string): Observable<ClusterInfo[]> {
    if (!environment) {
      return of([]);
    }
    return of(this.clusterConfig.clusters[environment] || []);
  }

  getConfiguration(pattern: string, environment: string, selectedComponents: any, selectedCluster?: string): Observable<{ title: string; sections: any[] } | undefined> {
    return new Observable(subscriber => {
      this.getConfig(pattern, environment, selectedComponents, selectedCluster).then(config => {
        subscriber.next(config || undefined);
        subscriber.complete();
      });
    });
  }

  private async getConfig(pattern: string, environment: string, selectedComponents: any, selectedCluster?: string): Promise<{ title: string; sections: any[] } | null> {
    try {
      // Load the appropriate markdown file based on pattern
      const response = await this.http.get(`/assets/config/${pattern}-${environment}.md`, { responseType: 'text' }).toPromise();
      if (!response) return null;

      // Get cluster info if selectedCluster is provided
      const clusterInfo = selectedCluster ? 
        this.clusterConfig.clusters[environment]?.find(c => c.name === selectedCluster) :
        undefined;

      // Split the content into sections
      const sections = this.parseSections(response, clusterInfo);

      // Filter sections based on selected components
      const filteredSections = sections.filter(section => 
        this.shouldShowSection(section, selectedComponents)
      );

      return {
        title: `${pattern} Pattern - ${environment} Environment`,
        sections: filteredSections
      };
    } catch (error) {
      console.error('Error loading configuration:', error);
      return null;
    }
  }

  private parseSections(content: string, selectedCluster?: ClusterInfo): any[] {
    const sections: any[] = [];
    const lines = content.split('\n');
    let currentSection: any = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        // Save previous section if exists
        if (currentSection) {
          currentSection.content = this.replaceClusterInfo(currentContent.join('\n').trim(), selectedCluster);
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          title: line.substring(3).trim(),
          content: '',
          requiredComponents: this.extractRequiredComponents(line.substring(3).trim())
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      currentSection.content = this.replaceClusterInfo(currentContent.join('\n').trim(), selectedCluster);
      sections.push(currentSection);
    }

    return sections;
  }

  private replaceClusterInfo(content: string, selectedCluster: ClusterInfo | undefined): string {
    if (!selectedCluster) return content;
    
    // Create a map dynamically from all properties in the cluster info
    const clusterInfoMap: { [key: string]: string } = Object.entries(selectedCluster)
      .reduce((acc, [key, value]) => {
        if (typeof value === 'string') {
          acc[key] = value;
        }
        return acc;
      }, {} as { [key: string]: string });

    // Replace all occurrences of <!key!> with corresponding cluster info
    return content.replace(/<!(\w+)!>/g, (match, key) => {
      return clusterInfoMap[key] || match;
    });
  }

  private extractRequiredComponents(title: string): string[] | undefined {
    // Check if title matches any combination section
    for (const pattern in this.displayRules.rules) {
      for (const env in this.displayRules.rules[pattern]) {
        const options = this.displayRules.rules[pattern][env];
        const sections = options.sections;
        if (sections?.combinations) {
          for (const components in sections.combinations) {
            const sectionTitles = sections.combinations[components];
            if (sectionTitles.includes(title)) {
              return components.split(',');
            }
          }
        }
      }
    }

    // Check if title matches any base section
    for (const pattern in this.displayRules.rules) {
      for (const env in this.displayRules.rules[pattern]) {
        const options = this.displayRules.rules[pattern][env];
        const sections = options.sections;
        if (sections?.base?.includes(title)) {
          return undefined; // Base sections have no required components
        }
      }
    }

    // Check if title matches a single component
    for (const pattern in this.displayRules.rules) {
      for (const env in this.displayRules.rules[pattern]) {
        const options = this.displayRules.rules[pattern][env];
        const categories: ComponentCategory[] = ['ingress', 'egress', 'security', 'other'];
        for (const category of categories) {
          const componentList = options[category];
          if (componentList?.includes(title)) {
            return [title]; // Single component sections require that component
          }
        }
      }
    }

    return undefined;
  }

  private shouldShowSection(section: any, selectedComponents: any): boolean {
    if (!section || !section.requiredComponents) {
      return true;
    }

    const selectedComponentsList = Object.values(selectedComponents).flat();

    if (Array.isArray(section.requiredComponents)) {
      return section.requiredComponents.every((component: string) =>
        selectedComponentsList.includes(component)
      );
    }

    return selectedComponentsList.includes(section.requiredComponents);
  }
}
