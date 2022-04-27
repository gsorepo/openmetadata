export const addServiceGuide = [
  {
    step: 1,
    title: 'Add a New Service',
    description: `Choose from the range of services that OpenMetadata integrates with. 
    To add a new service, start by selecting a Service Category (Database, Messaging, Dashboard, or Pipeline). 
    From the list of available services, select the one you’d want to integrate with.`,
  },
  {
    step: 2,
    title: 'Configure a Service',
    description: `Enter a unique service name. The name must be unique across the category of services. 
      For e.g., among database services, both MySQL and Snowflake cannot have the same service name (E.g. customer_data). 
      However, different service categories (dashboard, pipeline) can have the same service name. 
      Spaces are not supported in the service name. Characters like - _ are supported. Also, add a description.`,
  },
  {
    step: 3,
    title: 'Connection Details',
    description: `Every service comes with its standard set of requirements and here are the basics of what you’d need to connect. 
      The connection requirements are generated from the JSON schema for that service. The mandatory fields are marked with an asterisk.`,
  },
  {
    step: 4,
    title: 'Service Created Successfully',
    description:
      'The <Service Name> has been created successfully. Visit the newly created service to take a look at the details. You can also set up the metadata ingestion.',
  },
];

const schedulingIngestionGuide = {
  step: 2,
  title: 'Schedule for Ingestion',
  description:
    'Scheduling can be set up at an hourly, daily, or weekly cadence. The timezone is in UTC. Select a Start Date to schedule for ingestion. It is optional to add an End Date.',
};

export const addMetadataIngestionGuide = [
  {
    step: 1,
    title: 'Add Metadata Ingestion',
    description: `Based on the service type selected, enter the filter pattern details for the schema or table (database), or topic (messaging), or dashboard. 
      You can include or exclude the filter patterns. Choose to include views, enable or disable the data profiler, and ingest sample data, as required.`,
  },
  {
    ...schedulingIngestionGuide,
  },
  {
    step: 3,
    title: 'Metadata Ingestion Added Successfully',
    description:
      'You are all set! The <Ingestion Pipeline Name> has been successfully deployed. The metadata will be ingested at a regular interval as per the schedule.',
  },
];

export const addUsageIngestionGuide = [
  {
    step: 1,
    title: 'Add Usage Ingestion',
    description: `We can create a workflow that will obtain the query log and table creation information from the underlying database and feed it to OpenMetadata. 
    The Usage Ingestion will be in charge of obtaining this data.`,
  },
  {
    ...schedulingIngestionGuide,
  },
  {
    step: 3,
    title: 'Usage Ingestion Added Successfully',
    description:
      'You are all set! The <Ingestion Pipeline Name> has been successfully deployed. The usage will be ingested at a regular interval as per the schedule.',
  },
];

export const addProfilerIngestionGuide = [
  {
    step: 1,
    title: 'Add Profiler Ingestion',
    description: `After the metadata ingestion has been done correctly, we can configure and deploy the Profiler Workflow.
    This Pipeline will be in charge of feeding the Profiler tab of the Table Entity, as well as running any tests configured in the Entity.`,
  },
  { ...schedulingIngestionGuide },
  {
    step: 3,
    title: 'Profiler Ingestion Added Successfully',
    description:
      'You are all set! The <Ingestion Pipeline Name> has been successfully deployed. The profiler will run at a regular interval as per the schedule.',
  },
];
