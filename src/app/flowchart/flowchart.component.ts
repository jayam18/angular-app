import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../services/config.service';

interface Pattern {
  id: string;
  name: string;
}

interface Environment {
  id: string;
  name: string;
}

interface ComponentSelections {
  ingress: string[];
  egress: string[];
  security: string[];
  other: string[];
}

@Component({
  selector: 'app-flowchart',
  templateUrl: './flowchart.component.html',
  styleUrls: ['./flowchart.component.css']
})
export class FlowchartComponent implements OnInit {
  readonly patterns: Pattern[] = [
    { id: 'active-active', name: 'Active-Active' },
    { id: 'active-passive', name: 'Active-Passive' },
    { id: 'active-dr', name: 'Active-DR' }
  ];

  readonly environments: Environment[] = [
    { id: 'development', name: 'Development' },
    { id: 'test', name: 'Test' },
    { id: 'production', name: 'Production' }
  ];

  clusters: any[] = [];
  selectedCluster = '';
  applicationHostUri = '';

  ingressOptions: string[] = [];
  egressOptions: string[] = [];
  securityOptions: string[] = [];
  otherOptions: string[] = [];

  selectedPattern = '';
  selectedEnvironment = '';
  selectedComponents: ComponentSelections = {
    ingress: [],
    egress: [],
    security: [],
    other: []
  };

  currentConfig: any = null;

  constructor(private configService: ConfigService) {}

  ngOnInit(): void {
    this.selectedPattern = this.patterns[0].id;
    this.selectedEnvironment = this.environments[0].id;
    this.loadInitialState();
  }

  private loadInitialState(): void {
    this.loadComponentOptions();
    this.loadClusterOptions();
    this.updateConfiguration();
  }

  loadComponentOptions(): void {
    if (!this.selectedPattern || !this.selectedEnvironment) {
      this.ingressOptions = [];
      this.egressOptions = [];
      this.securityOptions = [];
      this.otherOptions = [];
      return;
    }

    this.configService.getComponentOptions(this.selectedPattern, this.selectedEnvironment)
      .subscribe(options => {
        const { ingress = [], egress = [], security = [], other = [] } = options;
        this.ingressOptions = ingress;
        this.egressOptions = egress;
        this.securityOptions = security;
        this.otherOptions = other;
      });
  }

  loadClusterOptions(): void {
    this.configService.getClusterOptions(this.selectedEnvironment)
      .subscribe(clusters => {
        this.clusters = clusters;
        this.selectedCluster = clusters.length > 0 ? clusters[0].name : '';
      });
  }

  onPatternSelect(patternId: string): void {
    this.selectedPattern = patternId;
    // Reset component selections when pattern changes
    this.selectedComponents = {
      ingress: [],
      egress: [],
      security: [],
      other: []
    };
    this.loadComponentOptions();
    this.updateConfiguration();
  }

  onEnvironmentSelect(envId: string): void {
    this.selectedEnvironment = envId;
    // Reset component selections when environment changes
    this.selectedComponents = {
      ingress: [],
      egress: [],
      security: [],
      other: []
    };
    this.loadComponentOptions();
    this.loadClusterOptions();
    this.updateConfiguration();
  }

  onClusterSelect(clusterName: string): void {
    this.selectedCluster = clusterName;
    this.updateConfiguration();
  }

  updateConfiguration(): void {
    this.configService.getConfiguration(
      this.selectedPattern,
      this.selectedEnvironment,
      this.selectedComponents,
      this.selectedCluster
    ).subscribe(config => {
      this.currentConfig = config;
    });
  }

  getPatternName(patternId: string): string {
    return this.patterns.find(p => p.id === patternId)?.name || '';
  }

  getEnvironmentName(envId: string): string {
    return this.environments.find(e => e.id === envId)?.name || '';
  }

  shouldShowSection(section: any): boolean {
    if (!section || !this.selectedPattern || !this.selectedEnvironment) {
      return false;
    }

    // Get the current configuration
    const patternConfig = this.configService.getRules()?.[this.selectedPattern];
    if (!patternConfig) return false;

    const envConfig = patternConfig[this.selectedEnvironment];
    if (!envConfig) return false;

    // Always show base sections when pattern and environment are selected
    if (envConfig.sections?.base?.includes(section.title)) {
      return true;
    }

    const selectedComponentsList = Object.values(this.selectedComponents).flat();
    
    // For non-base sections, require component selection
    if (!section.requiredComponents) {
      return false;
    }

    // Handle combination sections
    return Array.isArray(section.requiredComponents) ?
      section.requiredComponents.every((component: string) => selectedComponentsList.includes(component)) :
      selectedComponentsList.includes(section.requiredComponents);
  }

  isComponentSelected(option: string, category: string): boolean {
    return this.selectedComponents[category as keyof ComponentSelections].includes(option);
  }

  onComponentSelect(option: string, category: string): void {
    const componentList = this.selectedComponents[category as keyof ComponentSelections];
    const index = componentList.indexOf(option);
    
    if (index === -1) {
      componentList.push(option);
    } else {
      componentList.splice(index, 1);
    }
    
    this.updateConfiguration();
  }

  getSelectedComponentsText(): string {
    const allSelected = Object.values(this.selectedComponents).flat();
    return allSelected.length > 0 ? allSelected.join(', ') : 'No components selected';
  }
}
