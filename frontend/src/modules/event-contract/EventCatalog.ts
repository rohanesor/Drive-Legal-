export interface CatalogEntry {
  eventType: string;
  version: string;
  producer: string;
  consumers: string[];
  description: string;
  sensitivity: 'HIGH' | 'MEDIUM' | 'LOW';
  retentionDays: number;
}

export class EventCatalog {
  private static catalog: CatalogEntry[] = [
    {
      eventType: 'location.updated',
      version: 'v1',
      producer: 'gps',
      consumers: ['navigation', 'state-coordinator'],
      description: 'Triggered when GPS location coordinates update.',
      sensitivity: 'HIGH',
      retentionDays: 1,
    },
    {
      eventType: 'risk.changed',
      version: 'v1',
      producer: 'risk-engine',
      consumers: ['alert-engine', 'state-coordinator'],
      description: 'Triggered when calculated safety risk shifts.',
      sensitivity: 'MEDIUM',
      retentionDays: 30,
    },
    {
      eventType: 'alert.created',
      version: 'v1',
      producer: 'alert-engine',
      consumers: ['state-coordinator', 'voice'],
      description: 'Triggered when driver hazard alert is triggered.',
      sensitivity: 'LOW',
      retentionDays: 7,
    },
  ];

  static getCatalog(): CatalogEntry[] {
    return this.catalog;
  }
}
export default EventCatalog;
