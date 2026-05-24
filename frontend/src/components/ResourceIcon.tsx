import {
  AIStudio,
  APIManagementServicesWeb,
  Alerts,
  AppConfiguration,
  AppServicesWeb,
  AppServicePlansWeb,
  ApplicationGateways,
  ApplicationInsightsMonitor,
  AzureCosmosDBDatabases,
  AzureDatabaseMySQLServer,
  AzureDatabasePostgreSQLServer,
  AzureOpenAI,
  AzureServiceBus,
  BotServices,
  CacheRedis,
  CognitiveServicesWeb,
  CognitiveSearchWeb,
  ContainerRegistries,
  ContainerAppsEnvironments,
  Disks,
  EventHubsAnalytics,
  FunctionAppsCompute,
  KeyVaults,
  KubernetesServicesCompute,
  LoadBalancers,
  LogAnalyticsWorkspacesMonitor,
  ManagedIdentities,
  NetworkInterfaces,
  PublicIPAddresses,
  SignalR,
  SQLDatabase,
  SQLServer,
  StorageAccounts,
  TrafficManagerProfiles,
  VirtualMachine,
  VirtualNetworks,
  WorkerContainerApp,
} from "@threeveloper/azure-react-icons"

interface ResourceIconProps {
  type: string
  kind?: string
}

const iconClassName = "h-[18px] w-[18px]"

type IconComponent = typeof VirtualMachine

const typeToIcon: Record<string, IconComponent> = {
  "microsoft.compute/virtualmachines": VirtualMachine,
  "microsoft.compute/virtualmachinescalesets": VirtualMachine,
  "microsoft.compute/disks": Disks,
  "microsoft.compute/snapshots": Disks,
  "microsoft.containerservice/managedclusters": KubernetesServicesCompute,
  "microsoft.network/publicipaddresses": PublicIPAddresses,
  "microsoft.network/networkinterfaces": NetworkInterfaces,
  "microsoft.network/virtualnetworks": VirtualNetworks,
  "microsoft.network/loadbalancers": LoadBalancers,
  "microsoft.network/applicationgateways": ApplicationGateways,
  "microsoft.network/trafficmanagerprofiles": TrafficManagerProfiles,
  "microsoft.web/serverfarms": AppServicePlansWeb,
  "microsoft.web/sites": AppServicesWeb,
  "microsoft.app/containerapps": WorkerContainerApp,
  "microsoft.app/managedenvironments": ContainerAppsEnvironments,
  "microsoft.appconfiguration/configurationstores": AppConfiguration,
  "microsoft.botservice/botservices": BotServices,
  "microsoft.containerregistry/registries": ContainerRegistries,
  "microsoft.search/searchservices": CognitiveSearchWeb,
  "microsoft.cognitiveservices/accounts": CognitiveServicesWeb,
  "microsoft.cognitiveservices/accounts/projects": AIStudio,
  "microsoft.machinelearningservices/workspaces": AIStudio,
  "microsoft.machinelearningservices/workspaces/projects": AIStudio,
  "microsoft.sql/servers": SQLServer,
  "microsoft.sql/servers/databases": SQLDatabase,
  "microsoft.storage/storageaccounts": StorageAccounts,
  "microsoft.keyvault/vaults": KeyVaults,
  "microsoft.documentdb/databaseaccounts": AzureCosmosDBDatabases,
  "microsoft.cache/redis": CacheRedis,
  "microsoft.cache/redisenterprise": CacheRedis,
  "microsoft.servicebus/namespaces": AzureServiceBus,
  "microsoft.eventhub/namespaces": EventHubsAnalytics,
  "microsoft.insights/components": ApplicationInsightsMonitor,
  "microsoft.insights/metricalerts": Alerts,
  "microsoft.operationalinsights/workspaces": LogAnalyticsWorkspacesMonitor,
  "microsoft.managedidentity/userassignedidentities": ManagedIdentities,
  "microsoft.apimanagement/service": APIManagementServicesWeb,
  "microsoft.signalrservice/signalr": SignalR,
  "microsoft.dbformysql/flexibleservers": AzureDatabaseMySQLServer,
  "microsoft.dbforpostgresql/flexibleservers": AzureDatabasePostgreSQLServer,
}

export function ResourceIcon({ type, kind }: ResourceIconProps) {
  const normalized = type.toLowerCase()
  const normalizedKind = (kind || "").toLowerCase()

  let Icon = typeToIcon[normalized] ?? VirtualMachine
  if (normalized === "microsoft.web/sites") {
    if (normalizedKind.includes("functionapp") || normalizedKind.includes("function")) {
      Icon = FunctionAppsCompute
    } else {
      Icon = AppServicesWeb
    }
  }

  if (normalized === "microsoft.cognitiveservices/accounts") {
    if (normalizedKind.includes("openai")) {
      Icon = AzureOpenAI
    } else if (normalizedKind.includes("aistudio") || normalizedKind.includes("foundry")) {
      Icon = AIStudio
    } else {
      Icon = CognitiveServicesWeb
    }
  }

  return (
    <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border-[0.5px] border-border bg-surface-2">
      <Icon className={iconClassName} size="18" />
    </span>
  )
}
