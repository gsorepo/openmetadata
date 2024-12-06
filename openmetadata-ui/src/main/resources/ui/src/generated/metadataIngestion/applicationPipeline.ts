/*
 *  Copyright 2024 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */


 /**
 * Application Pipeline Configuration.
 */
export interface ApplicationPipeline {
    /**
     * Application configuration
     */
    appConfig?: any[] | boolean | CollateAIAppConfig | number | null | string;
    /**
     * Application private configuration
     */
    appPrivateConfig?: PrivateConfig;
    /**
     * Source Python Class Name to run the application
     */
    sourcePythonClass?: string;
    /**
     * Pipeline type
     */
    type?: ApplicationConfigType;
}

/**
 * Configuration for the CollateAI External Application.
 *
 * Configuration for the Automator External Application.
 *
 * No configuration needed to instantiate the Data Insights Pipeline. The logic is handled
 * in the backend.
 *
 * Search Indexing App.
 *
 * This schema defines the Slack App Token Configuration
 */
export interface CollateAIAppConfig {
    /**
     * Query filter to be passed to ES. E.g.,
     * `{"query":{"bool":{"must":[{"bool":{"should":[{"term":{"domain.displayName.keyword":"DG
     * Anim"}}]}}]}}}`. This is the same payload as in the Explore page.
     */
    filter?: string;
    /**
     * Patch the description if it is empty, instead of raising a suggestion
     */
    patchIfEmpty?: boolean;
    /**
     * Application Type
     */
    type?: Type;
    /**
     * Action to take on those entities. E.g., propagate description through lineage, auto
     * tagging, etc.
     */
    actions?: Action[];
    /**
     * Entities selected to run the automation.
     */
    resources?:             Resource;
    backfillConfiguration?: BackfillConfiguration;
    /**
     * Maximum number of events processed at a time (Default 100).
     *
     * Maximum number of events sent in a batch (Default 100).
     */
    batchSize?: number;
    /**
     * Recreates the DataAssets index on DataInsights. Useful if you changed a Custom Property
     * Type and are facing errors. Bear in mind that recreating the index will delete your
     * DataAssets and a backfill will be needed.
     */
    recreateDataAssetsIndex?: boolean;
    sendToAdmins?:            boolean;
    sendToTeams?:             boolean;
    /**
     * Number of threads to use for reindexing
     */
    consumerThreads?: number;
    /**
     * List of Entities to Reindex
     */
    entities?: string[];
    /**
     * Initial backoff time in milliseconds
     */
    initialBackoff?: number;
    /**
     * Maximum backoff time in milliseconds
     */
    maxBackoff?: number;
    /**
     * Maximum number of concurrent requests to the search index
     */
    maxConcurrentRequests?: number;
    /**
     * Maximum number of retries for a failed request
     */
    maxRetries?: number;
    /**
     * Maximum number of events sent in a batch (Default 100).
     */
    payLoadSize?: number;
    /**
     * Number of threads to use for reindexing
     */
    producerThreads?: number;
    /**
     * Queue Size to user internally for reindexing.
     */
    queueSize?: number;
    /**
     * This schema publisher run modes.
     */
    recreateIndex?: boolean;
    /**
     * Recreate Indexes with updated Language
     */
    searchIndexMappingLanguage?: SearchIndexMappingLanguage;
    /**
     * Bot Token
     */
    botToken?: string;
    /**
     * User Token
     */
    userToken?: string;
}

/**
 * Action to take on those entities. E.g., propagate description through lineage, auto
 * tagging, etc.
 *
 * Apply Tags to the selected assets.
 *
 * Remove Tags Action Type
 *
 * Add an owner to the selected assets.
 *
 * Remove Owner Action Type
 *
 * Add owners to the selected assets.
 *
 * Propagate description, tags and glossary terms via lineage
 *
 * ML Tagging action configuration for external automator.
 */
export interface Action {
    /**
     * Apply tags to the children of the selected assets that match the criteria. E.g., columns,
     * tasks, topic fields,...
     *
     * Remove tags from all the children of the selected assets. E.g., columns, tasks, topic
     * fields,...
     *
     * Apply the description to the children of the selected assets that match the criteria.
     * E.g., columns, tasks, topic fields,...
     *
     * Remove descriptions from all children of the selected assets. E.g., columns, tasks, topic
     * fields,...
     */
    applyToChildren?: string[];
    /**
     * Update tags even if they are already defined in the asset. By default, incoming tags are
     * merged with the existing ones.
     *
     * Update the domain even if it is defined in the asset. By default, we will only apply the
     * domain to assets without domain.
     *
     * Update the description even if they are already defined in the asset. By default, we'll
     * only add the descriptions to assets without the description set.
     *
     * Update the tier even if it is defined in the asset. By default, we will only apply the
     * tier to assets without tier.
     *
     * Update the owners even if it is defined in the asset. By default, we will only apply the
     * owners to assets without owner.
     *
     * Update descriptions, tags and Glossary Terms via lineage even if they are already defined
     * in the asset. By default, descriptions are only updated if they are not already defined
     * in the asset, and incoming tags are merged with the existing ones.
     */
    overwriteMetadata?: boolean;
    /**
     * Tags to apply
     *
     * Tags to remove
     */
    tags?: TagLabel[];
    /**
     * Application Type
     */
    type: ActionType;
    /**
     * Domain to apply
     */
    domain?: EntityReference;
    /**
     * Description to apply
     */
    description?: string;
    /**
     * tier to apply
     */
    tier?: TagLabel;
    /**
     * Owners to apply
     */
    owners?: EntityReference[];
    /**
     * Propagate the metadata to columns via column-level lineage.
     */
    propagateColumnLevel?: boolean;
    /**
     * Propagate description through lineage
     */
    propagateDescription?: boolean;
    /**
     * Propagate glossary terms through lineage
     */
    propagateGlossaryTerms?: boolean;
    /**
     * Propagate owner from the parent
     */
    propagateOwner?: boolean;
    /**
     * Propagate the metadata to the parents (e.g., tables) via lineage.
     */
    propagateParent?: boolean;
    /**
     * Propagate tags through lineage
     */
    propagateTags?: boolean;
    /**
     * Propagate tier from the parent
     */
    propagateTier?: boolean;
}

/**
 * Domain to apply
 *
 * This schema defines the EntityReference type used for referencing an entity.
 * EntityReference is used for capturing relationships from one entity to another. For
 * example, a table has an attribute called database of type EntityReference that captures
 * the relationship of a table `belongs to a` database.
 *
 * Owners to apply
 *
 * This schema defines the EntityReferenceList type used for referencing an entity.
 * EntityReference is used for capturing relationships from one entity to another. For
 * example, a table has an attribute called database of type EntityReference that captures
 * the relationship of a table `belongs to a` database.
 */
export interface EntityReference {
    /**
     * If true the entity referred to has been soft-deleted.
     */
    deleted?: boolean;
    /**
     * Optional description of entity.
     */
    description?: string;
    /**
     * Display Name that identifies this entity.
     */
    displayName?: string;
    /**
     * Fully qualified name of the entity instance. For entities such as tables, databases
     * fullyQualifiedName is returned in this field. For entities that don't have name hierarchy
     * such as `user` and `team` this will be same as the `name` field.
     */
    fullyQualifiedName?: string;
    /**
     * Link to the entity resource.
     */
    href?: string;
    /**
     * Unique identifier that identifies an entity instance.
     */
    id: string;
    /**
     * If true the relationship indicated by this entity reference is inherited from the parent
     * entity.
     */
    inherited?: boolean;
    /**
     * Name of the entity instance.
     */
    name?: string;
    /**
     * Entity type/class name - Examples: `database`, `table`, `metrics`, `databaseService`,
     * `dashboardService`...
     */
    type: string;
}

/**
 * This schema defines the type for labeling an entity with a Tag.
 *
 * tier to apply
 */
export interface TagLabel {
    /**
     * Description for the tag label.
     */
    description?: string;
    /**
     * Display Name that identifies this tag.
     */
    displayName?: string;
    /**
     * Link to the tag resource.
     */
    href?: string;
    /**
     * Label type describes how a tag label was applied. 'Manual' indicates the tag label was
     * applied by a person. 'Derived' indicates a tag label was derived using the associated tag
     * relationship (see Classification.json for more details). 'Propagated` indicates a tag
     * label was propagated from upstream based on lineage. 'Automated' is used when a tool was
     * used to determine the tag label.
     */
    labelType: LabelType;
    /**
     * Name of the tag or glossary term.
     */
    name?: string;
    /**
     * Label is from Tags or Glossary.
     */
    source: TagSource;
    /**
     * 'Suggested' state is used when a tag label is suggested by users or tools. Owner of the
     * entity must confirm the suggested labels before it is marked as 'Confirmed'.
     */
    state:  State;
    style?: Style;
    tagFQN: string;
}

/**
 * Label type describes how a tag label was applied. 'Manual' indicates the tag label was
 * applied by a person. 'Derived' indicates a tag label was derived using the associated tag
 * relationship (see Classification.json for more details). 'Propagated` indicates a tag
 * label was propagated from upstream based on lineage. 'Automated' is used when a tool was
 * used to determine the tag label.
 */
export enum LabelType {
    Automated = "Automated",
    Derived = "Derived",
    Manual = "Manual",
    Propagated = "Propagated",
}

/**
 * Label is from Tags or Glossary.
 */
export enum TagSource {
    Classification = "Classification",
    Glossary = "Glossary",
}

/**
 * 'Suggested' state is used when a tag label is suggested by users or tools. Owner of the
 * entity must confirm the suggested labels before it is marked as 'Confirmed'.
 */
export enum State {
    Confirmed = "Confirmed",
    Suggested = "Suggested",
}

/**
 * UI Style is used to associate a color code and/or icon to entity to customize the look of
 * that entity in UI.
 */
export interface Style {
    /**
     * Hex Color Code to mark an entity such as GlossaryTerm, Tag, Domain or Data Product.
     */
    color?: string;
    /**
     * An icon to associate with GlossaryTerm, Tag, Domain or Data Product.
     */
    iconURL?: string;
}

/**
 * Application Type
 *
 * Add Tags action type.
 *
 * Remove Tags Action Type.
 *
 * Add Owner Action Type.
 *
 * Remove Domain Action Type
 *
 * Add Description Action Type.
 *
 * Remove Description Action Type
 *
 * Add Tier Action Type.
 *
 * Remove Tier Action Type
 *
 * Remove Owner Action Type
 *
 * Lineage propagation action type.
 *
 * ML PII Tagging action type.
 */
export enum ActionType {
    AddDescriptionAction = "AddDescriptionAction",
    AddDomainAction = "AddDomainAction",
    AddOwnerAction = "AddOwnerAction",
    AddTagsAction = "AddTagsAction",
    AddTierAction = "AddTierAction",
    LineagePropagationAction = "LineagePropagationAction",
    MLTaggingAction = "MLTaggingAction",
    RemoveDescriptionAction = "RemoveDescriptionAction",
    RemoveDomainAction = "RemoveDomainAction",
    RemoveOwnerAction = "RemoveOwnerAction",
    RemoveTagsAction = "RemoveTagsAction",
    RemoveTierAction = "RemoveTierAction",
}

/**
 * Backfill Configuration
 */
export interface BackfillConfiguration {
    /**
     * Enable Backfill for the configured dates
     */
    enabled?: boolean;
    /**
     * Date for which the backfill will end
     */
    endDate?: Date;
    /**
     * Date from which to start the backfill
     */
    startDate?: Date;
    [property: string]: any;
}

/**
 * Entities selected to run the automation.
 */
export interface Resource {
    /**
     * Query filter to be passed to ES. E.g.,
     * `{"query":{"bool":{"must":[{"bool":{"should":[{"term":{"domain.displayName.keyword":"DG
     * Anim"}}]}}]}}}`. This is the same payload as in the Explore page.
     */
    queryFilter?: string;
    /**
     * Type of the entity. E.g., 'table', 'chart',...
     */
    type?: string[];
    [property: string]: any;
}

/**
 * Recreate Indexes with updated Language
 *
 * This schema defines the language options available for search index mappings.
 */
export enum SearchIndexMappingLanguage {
    En = "EN",
    Jp = "JP",
    Zh = "ZH",
}

/**
 * Application Type
 *
 * Application type.
 */
export enum Type {
    Automator = "Automator",
    CollateAI = "CollateAI",
    DataInsights = "DataInsights",
    DataInsightsReport = "DataInsightsReport",
    SearchIndexing = "SearchIndexing",
}

/**
 * Application private configuration
 *
 * PRivate Configuration for the CollateAI External Application.
 */
export interface PrivateConfig {
    /**
     * Collate Server public URL. WAII will use this information to interact with the server.
     * E.g., https://sandbox.getcollate.io
     */
    collateURL: string;
    /**
     * Limits for the CollateAI Application.
     */
    limits: CollateAILimits;
    /**
     * WAII API Token
     */
    token: string;
    /**
     * WAII API host URL
     */
    waiiInstance: string;
}

/**
 * Limits for the CollateAI Application.
 */
export interface CollateAILimits {
    /**
     * Start of the billing cycle.
     */
    billingCycleStart?: Date;
    /**
     * Maximum number of descriptions generated by the CollateAI
     */
    descriptions?: number;
    /**
     * Maximum number of queries generated by CollateAI.
     */
    queries?: number;
    [property: string]: any;
}

/**
 * Pipeline type
 *
 * Pipeline Source Config For Application Pipeline type. Nothing is required.
 */
export enum ApplicationConfigType {
    Application = "Application",
}
