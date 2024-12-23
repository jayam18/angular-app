import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../services/config.service';

@Component({
  selector: 'app-flowchart',
  templateUrl: './flowchart.component.html',
  styleUrls: ['./flowchart.component.css']
})
export class FlowchartComponent implements OnInit {
  patterns = [
    { id: 'active-active', name: 'Active-Active' },
    { id: 'active-passive', name: 'Active-Passive' },
    { id: 'active-dr', name: 'Active-DR' }
  ];

  environments = [
    { id: 'development', name: 'Development' },
    { id: 'test', name: 'Test' },
    { id: 'production', name: 'Production' }
  ];

  clusters: any[] = [];
  selectedCluster: string = '';
  applicationHostUri: string = '';

  ingressOptions: string[] = [];
  egressOptions: string[] = [];
  securityOptions: string[] = [];
  otherOptions: string[] = [];

  selectedPattern: string = '';
  selectedEnvironment: string = '';
  selectedComponents: { [key: string]: string[] } = {
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
    this.loadComponentOptions();
    this.loadClusterOptions();
    this.updateConfiguration();
  }

  loadComponentOptions(): void {
    this.configService.getComponentOptions(this.selectedPattern, this.selectedEnvironment)
      .subscribe(options => {
        this.ingressOptions = options.ingress || [];
        this.egressOptions = options.egress || [];
        this.securityOptions = options.security || [];
        this.otherOptions = options.other || [];
      });
  }

  loadClusterOptions(): void {
    this.configService.getClusterOptions(this.selectedEnvironment)
      .subscribe(clusters => {
        this.clusters = clusters;
        if (clusters.length > 0) {
          this.selectedCluster = clusters[0].name;
        } else {
          this.selectedCluster = '';
        }
      });
  }

  onPatternSelect(patternId: string): void {
    this.selectedPattern = patternId;
    this.loadComponentOptions();
    this.updateConfiguration();
  }

  onEnvironmentSelect(envId: string): void {
    this.selectedEnvironment = envId;
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
    const pattern = this.patterns.find(p => p.id === patternId);
    return pattern ? pattern.name : '';
  }

  getEnvironmentName(envId: string): string {
    const env = this.environments.find(e => e.id === envId);
    return env ? env.name : '';
  }

  shouldShowSection(section: any): boolean {
    // 1. No sections shown until pattern and environment are selected
    if (!section || !this.selectedPattern || !this.selectedEnvironment) {
      return false;
    }

    const selectedComponentsList = Object.values(this.selectedComponents).flat();

    // Check if it's a combination section
    const isCombinationSection = section.title?.toLowerCase().includes('combination');

    // 2. Base sections (when pattern and environment are selected)
    if (!isCombinationSection) {
      // If section has required components (component section), show when component is selected
      if (section.requiredComponents) {
        if (Array.isArray(section.requiredComponents)) {
          return section.requiredComponents.every((component: string) =>
            selectedComponentsList.includes(component)
          );
        }
        return selectedComponentsList.includes(section.requiredComponents);
      }
      // Show base sections without requirements when pattern and environment are selected
      return true;
    }

    // 3. Combination sections
    if (isCombinationSection && section.requiredComponents) {
      // Check if all required components for the combination are selected
      if (Array.isArray(section.requiredComponents)) {
        return section.requiredComponents.every((component: string) =>
          selectedComponentsList.includes(component)
        );
      }
      return selectedComponentsList.includes(section.requiredComponents);
    }

    return false;
  }

  isComponentSelected(option: string, category: string): boolean {
    return this.selectedComponents[category].includes(option);
  }

  onComponentSelect(option: string, category: string): void {
    const index = this.selectedComponents[category].indexOf(option);
    if (index === -1) {
      this.selectedComponents[category].push(option);
    } else {
      this.selectedComponents[category].splice(index, 1);
    }
    this.updateConfiguration();
  }

  getSelectedComponentsText(): string {
    const allSelected = Object.values(this.selectedComponents)
      .flat()
      .filter(component => component);
    return allSelected.length > 0 ? allSelected.join(', ') : 'No components selected';
  }
}
