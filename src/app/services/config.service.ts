import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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

interface Section {
  title: string;
  content: string;
  requiredComponents?: string | string[];
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

interface ConfigResult {
  title: string;
  sections: Section[];
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private displayRules: DisplayRules = { rules: {} };
  private clusterConfig: ClusterConfig = { clusters: {} };
  private currentPattern = '';
  private currentEnvironment = '';

  constructor(private http: HttpClient) {
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    await Promise.all([
      this.loadDisplayRules(),
      this.loadClusterInfo()
    ]);
  }

  private async loadDisplayRules(): Promise<void> {
    try {
      const response = await this.http.get('/assets/config/display-rules.yaml', { responseType: 'text' }).toPromise();
      if (response) {
        this.displayRules = jsyaml.load(response) as DisplayRules;
      }
    } catch (error) {
      console.error('Error loading display rules:', error);
    }
  }

  private async loadClusterInfo(): Promise<void> {
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
    if (!pattern || !environment || !this.displayRules?.rules) {
      return of({});
    }
    
    const config = this.displayRules.rules[pattern]?.[environment];
    if (!config) {
      return of({});
    }
    
    // Extract only the component categories
    const { sections, ...componentCategories } = config;
    return of(componentCategories);
  }

  getClusterOptions(environment: string): Observable<ClusterInfo[]> {
    if (!environment) return of([]);
    return of(this.clusterConfig.clusters[environment] || []);
  }

  getConfiguration(pattern: string, environment: string, selectedComponents: any, selectedCluster?: string): Observable<ConfigResult | undefined> {
    this.currentPattern = pattern;
    this.currentEnvironment = environment;
    return new Observable(subscriber => {
      this.getConfig(pattern, environment, selectedComponents, selectedCluster).then(config => {
        subscriber.next(config || undefined);
        subscriber.complete();
      });
    });
  }

  private async getConfig(pattern: string, environment: string, selectedComponents: any, selectedCluster?: string): Promise<ConfigResult | null> {
    try {
      const response = await this.http.get(`/assets/config/${pattern}-${environment}.md`, { responseType: 'text' }).toPromise();
      if (!response) return null;

      const clusterInfo = selectedCluster ? 
        this.clusterConfig.clusters[environment]?.find(c => c.name === selectedCluster) :
        undefined;

      const sections = this.parseSections(response, clusterInfo);
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

  private parseSections(content: string, selectedCluster?: ClusterInfo): Section[] {
    const sections: Section[] = [];
    const lines = content.split('\n');
    let currentSection: Section | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentSection) {
          currentSection.content = this.replaceClusterInfo(currentContent.join('\n').trim(), selectedCluster);
          sections.push(currentSection);
        }

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

    if (currentSection) {
      currentSection.content = this.replaceClusterInfo(currentContent.join('\n').trim(), selectedCluster);
      sections.push(currentSection);
    }

    return sections;
  }

  private replaceClusterInfo(content: string, selectedCluster: ClusterInfo | undefined): string {
    if (!selectedCluster) return content;
    
    const clusterInfoMap = Object.entries(selectedCluster)
      .reduce((acc, [key, value]) => {
        if (typeof value === 'string') acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

    return content.replace(/<!(\w+)!>/g, (_, key) => clusterInfoMap[key] || `<!${key}!>`);
  }

  private shouldShowSection(section: Section, selectedComponents: any): boolean {
    if (!this.currentPattern || !this.currentEnvironment) {
      return false;
    }

    const patternConfig = this.displayRules?.rules?.[this.currentPattern];
    if (!patternConfig) {
      return false;
    }

    const envConfig = patternConfig[this.currentEnvironment];
    if (!envConfig) {
      return false;
    }

    // Always show base sections when pattern and environment are selected
    if (envConfig.sections?.base?.includes(section.title)) {
      return true;
    }

    const selectedComponentsList = Object.values(selectedComponents).flat();
    
    // For non-base sections, require component selection
    if (!section.requiredComponents) {
      return false;
    }
    
    return Array.isArray(section.requiredComponents) ?
      section.requiredComponents.every(component => selectedComponentsList.includes(component)) :
      selectedComponentsList.includes(section.requiredComponents);
  }

  private isBaseSection(title: string | undefined): boolean {
    if (!title) return false;
    
    const patternConfig = this.displayRules.rules[this.currentPattern];
    if (!patternConfig) return false;

    const envConfig = patternConfig[this.currentEnvironment];
    if (!envConfig) return false;

    return envConfig.sections?.base?.includes(title) || false;
  }

  private extractRequiredComponents(title: string): string[] | undefined {
    // Get the current pattern and environment's configuration
    const patternConfig = this.displayRules.rules[this.currentPattern];
    if (!patternConfig) return undefined;

    const envConfig = patternConfig[this.currentEnvironment];
    if (!envConfig) return undefined;

    const { sections, ...categories } = envConfig;

    // First check if it's a base section
    if (sections?.base?.includes(title)) {
      return undefined;
    }

    // Then check combinations
    if (sections?.combinations) {
      for (const [components, titles] of Object.entries(sections.combinations)) {
        if (titles.includes(title)) {
          return components.split(',');
        }
      }
    }

    // Finally check individual component sections
    for (const [category, componentList] of Object.entries(categories)) {
      if (componentList?.includes(title)) {
        return [title];
      }
    }

    // If the section is not found in any of the rules, treat it as a base section
    return undefined;
  }

  // Public method to get rules
  getRules() {
    return this.displayRules?.rules;
  }
}
