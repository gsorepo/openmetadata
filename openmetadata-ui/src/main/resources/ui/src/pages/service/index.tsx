/*
 *  Copyright 2021 Collate
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

import { AxiosError, AxiosResponse } from 'axios';
import classNames from 'classnames';
import { isNil, isUndefined } from 'lodash';
import { Paging } from 'Models';
import React, { Fragment, FunctionComponent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDashboards } from '../../axiosAPIs/dashboardAPI';
import { getDatabases } from '../../axiosAPIs/databaseAPI';
import { getPipelines } from '../../axiosAPIs/pipelineAPI';
import { getServiceByFQN, updateService } from '../../axiosAPIs/serviceAPI';
import { getTopics } from '../../axiosAPIs/topicsAPI';
import Description from '../../components/common/description/Description';
import NextPrevious from '../../components/common/next-previous/NextPrevious';
import PopOver from '../../components/common/popover/PopOver';
import RichTextEditorPreviewer from '../../components/common/rich-text-editor/RichTextEditorPreviewer';
import TitleBreadcrumb from '../../components/common/title-breadcrumb/title-breadcrumb.component';
import { TitleBreadcrumbProps } from '../../components/common/title-breadcrumb/title-breadcrumb.interface';
import PageContainer from '../../components/containers/PageContainer';
import Loader from '../../components/Loader/Loader';
import Tags from '../../components/tags/tags';
import { pagingObject } from '../../constants/constants';
import { SearchIndex } from '../../enums/search.enum';
import {
  DashboardServiceType,
  ServiceCategory,
} from '../../enums/service.enum';
import { Dashboard } from '../../generated/entity/data/dashboard';
import { Database } from '../../generated/entity/data/database';
import { Pipeline } from '../../generated/entity/data/pipeline';
import { Topic } from '../../generated/entity/data/topic';
import { DashboardService } from '../../generated/entity/services/dashboardService';
import { DatabaseService } from '../../generated/entity/services/databaseService';
import { MessagingService } from '../../generated/entity/services/messagingService';
import { PipelineService } from '../../generated/entity/services/pipelineService';
import useToastContext from '../../hooks/useToastContext';
import { isEven } from '../../utils/CommonUtils';
import {
  getFrequencyTime,
  getServiceCategoryFromType,
  serviceTypeLogo,
} from '../../utils/ServiceUtils';
import SVGIcons from '../../utils/SvgUtils';
import { getEntityLink, getUsagePercentile } from '../../utils/TableUtils';

type Data = Database & Topic & Dashboard;
type ServiceDataObj = { name: string } & Partial<DatabaseService> &
  Partial<MessagingService> &
  Partial<DashboardService> &
  Partial<PipelineService>;

const ServicePage: FunctionComponent = () => {
  const { serviceFQN, serviceType, serviceCategory } = useParams() as Record<
    string,
    string
  >;
  const [serviceName, setServiceName] = useState(
    serviceCategory || getServiceCategoryFromType(serviceType)
  );
  const [slashedTableName, setSlashedTableName] = useState<
    TitleBreadcrumbProps['titleLinks']
  >([]);
  const [isEdit, setIsEdit] = useState(false);
  const [description, setDescription] = useState('');
  const [serviceDetails, setServiceDetails] = useState<ServiceDataObj>();
  const [data, setData] = useState<Array<Data>>([]);
  const [isLoading, setIsloading] = useState(true);
  const [paging, setPaging] = useState<Paging>(pagingObject);
  const [instanceCount, setInstanceCount] = useState<number>(0);
  const showToast = useToastContext();

  const fetchDatabases = (paging?: string) => {
    setIsloading(true);
    getDatabases(serviceFQN, paging, ['owner', 'usageSummary'])
      .then((res: AxiosResponse) => {
        if (res.data.data) {
          setData(res.data.data);
          setPaging(res.data.paging);
          setInstanceCount(res.data.paging.total);
          setIsloading(false);
        } else {
          setData([]);
          setPaging(pagingObject);
          setIsloading(false);
        }
      })
      .catch(() => {
        setIsloading(false);
      });
  };

  const fetchTopics = (paging?: string) => {
    setIsloading(true);
    getTopics(serviceFQN, paging, ['owner', 'tags'])
      .then((res: AxiosResponse) => {
        if (res.data.data) {
          setData(res.data.data);
          setPaging(res.data.paging);
          setInstanceCount(res.data.paging.total);
          setIsloading(false);
        } else {
          setData([]);
          setPaging(pagingObject);
          setIsloading(false);
        }
      })
      .catch(() => {
        setIsloading(false);
      });
  };

  const fetchDashboards = (paging?: string) => {
    setIsloading(true);
    getDashboards(serviceFQN, paging, ['owner', 'usageSummary', 'tags'])
      .then((res: AxiosResponse) => {
        if (res.data.data) {
          setData(res.data.data);
          setPaging(res.data.paging);
          setInstanceCount(res.data.paging.total);
          setIsloading(false);
        } else {
          setData([]);
          setPaging(pagingObject);
          setIsloading(false);
        }
      })
      .catch(() => {
        setIsloading(false);
      });
  };

  const fetchPipeLines = (paging?: string) => {
    setIsloading(true);
    getPipelines(serviceFQN, paging, ['owner', 'usageSummary', 'tags'])
      .then((res: AxiosResponse) => {
        if (res.data.data) {
          setData(res.data.data);
          setPaging(res.data.paging);
          setInstanceCount(res.data.paging.total);
          setIsloading(false);
        } else {
          setData([]);
          setPaging(pagingObject);
          setIsloading(false);
        }
      })
      .catch(() => {
        setIsloading(false);
      });
  };

  const getOtherDetails = (paging?: string) => {
    switch (serviceName) {
      case ServiceCategory.DATABASE_SERVICES: {
        fetchDatabases(paging);

        break;
      }
      case ServiceCategory.MESSAGING_SERVICES: {
        fetchTopics(paging);

        break;
      }
      case ServiceCategory.DASHBOARD_SERVICES: {
        fetchDashboards(paging);

        break;
      }
      case ServiceCategory.PIPELINE_SERVICES: {
        fetchPipeLines(paging);

        break;
      }
      default:
        break;
    }
  };

  const getLinkForFqn = (fqn: string) => {
    switch (serviceName) {
      case ServiceCategory.MESSAGING_SERVICES:
        return getEntityLink(SearchIndex.TOPIC, fqn);

      case ServiceCategory.DASHBOARD_SERVICES:
        return getEntityLink(SearchIndex.DASHBOARD, fqn);

      case ServiceCategory.PIPELINE_SERVICES:
        return getEntityLink(SearchIndex.PIPELINE, fqn);

      case ServiceCategory.DATABASE_SERVICES:
      default:
        return `/database/${fqn}`;
    }
  };

  const getOptionalFields = (): JSX.Element => {
    switch (serviceName) {
      case ServiceCategory.DATABASE_SERVICES: {
        return (
          <span>
            <span className="tw-text-grey-muted tw-font-normal">
              Driver Class :
            </span>{' '}
            <span className="tw-pl-1tw-font-normal ">
              {serviceDetails?.jdbc?.driverClass || '--'}
            </span>
            <span className="tw-mx-3 tw-text-grey-muted">•</span>
          </span>
        );
      }
      case ServiceCategory.MESSAGING_SERVICES: {
        return (
          <>
            <span>
              <span className="tw-text-grey-muted tw-font-normal">
                Brokers :
              </span>{' '}
              <span className="tw-pl-1tw-font-normal ">
                {serviceDetails?.brokers?.length ? (
                  <>
                    {serviceDetails.brokers.slice(0, 3).join(', ')}
                    {serviceDetails.brokers.length > 3 ? (
                      <PopOver
                        html={
                          <div className="tw-text-left">
                            {serviceDetails.brokers
                              .slice(3)
                              .map((broker, index) => (
                                <Fragment key={index}>
                                  <span className="tw-block tw-py-1">
                                    {broker}
                                  </span>
                                </Fragment>
                              ))}
                          </div>
                        }
                        position="bottom"
                        theme="light"
                        trigger="click">
                        <span className="show-more tw-ml-1">...</span>
                      </PopOver>
                    ) : null}
                  </>
                ) : (
                  '--'
                )}
              </span>
              <span className="tw-mx-3 tw-text-grey-muted">•</span>
            </span>
            <span>
              <span className="tw-text-grey-muted tw-font-normal">
                Schema registry :
              </span>{' '}
              <span className="tw-pl-1tw-font-normal ">
                {serviceDetails?.schemaRegistry ? (
                  <a
                    className="link-text"
                    href={serviceDetails.schemaRegistry}
                    rel="noopener noreferrer"
                    target="_blank">
                    <>
                      <span className="tw-mr-1">
                        {serviceDetails.schemaRegistry}
                      </span>
                      <SVGIcons
                        alt="external-link"
                        className="tw-align-middle"
                        icon="external-link"
                        width="12px"
                      />
                    </>
                  </a>
                ) : (
                  '--'
                )}
              </span>
              <span className="tw-mx-3 tw-text-grey-muted">•</span>
            </span>
          </>
        );
      }
      case ServiceCategory.DASHBOARD_SERVICES: {
        let elemFields: JSX.Element;
        switch (serviceType) {
          // case DashboardServiceType.REDASH:
          //   {
          //     // TODO: add Redash fields if required
          //   }

          //   break;
          case DashboardServiceType.TABLEAU:
            {
              elemFields = (
                <>
                  <span>
                    <span className="tw-text-grey-muted tw-font-normal">
                      Site Url :
                    </span>{' '}
                    <span className="tw-pl-1tw-font-normal ">
                      {serviceDetails?.dashboardUrl ? (
                        <a
                          className="link-text"
                          href={serviceDetails.dashboardUrl}
                          rel="noopener noreferrer"
                          target="_blank">
                          <>
                            <span className="tw-mr-1">
                              {serviceDetails.dashboardUrl}
                            </span>
                            <SVGIcons
                              alt="external-link"
                              className="tw-align-middle"
                              icon="external-link"
                              width="12px"
                            />
                          </>
                        </a>
                      ) : (
                        '--'
                      )}
                    </span>
                    <span className="tw-mx-3 tw-text-grey-muted">•</span>
                  </span>
                </>
              );
            }

            break;
          default: {
            elemFields = (
              <span>
                <span className="tw-text-grey-muted tw-font-normal">
                  Dashboard Url :
                </span>{' '}
                <span className="tw-pl-1tw-font-normal ">
                  {serviceDetails?.dashboardUrl ? (
                    <a
                      className="link-text"
                      href={serviceDetails.dashboardUrl}
                      rel="noopener noreferrer"
                      target="_blank">
                      <>
                        <span className="tw-mr-1">
                          {serviceDetails.dashboardUrl}
                        </span>
                        <SVGIcons
                          alt="external-link"
                          className="tw-align-middle"
                          icon="external-link"
                          width="12px"
                        />
                      </>
                    </a>
                  ) : (
                    '--'
                  )}
                </span>
                <span className="tw-mx-3 tw-text-grey-muted">•</span>
              </span>
            );
          }
        }

        return elemFields;
      }
      case ServiceCategory.PIPELINE_SERVICES:
        return (
          <span>
            <span className="tw-text-grey-muted tw-font-normal">
              Pipeline Url :
            </span>{' '}
            <span className="tw-pl-1tw-font-normal ">
              {serviceDetails?.pipelineUrl ? (
                <a
                  className="link-text"
                  href={serviceDetails.pipelineUrl}
                  rel="noopener noreferrer"
                  target="_blank">
                  <>
                    <span className="tw-mr-1">
                      {serviceDetails.pipelineUrl}
                    </span>
                    <SVGIcons
                      alt="external-link"
                      className="tw-align-middle"
                      icon="external-link"
                      width="12px"
                    />
                  </>
                </a>
              ) : (
                '--'
              )}
            </span>
            <span className="tw-mx-3 tw-text-grey-muted">•</span>
          </span>
        );

      default: {
        return <></>;
      }
    }
  };

  const getTableHeaders = (): JSX.Element => {
    switch (serviceName) {
      case ServiceCategory.DATABASE_SERVICES: {
        return (
          <>
            <th className="tableHead-cell">Database Name</th>
            <th className="tableHead-cell">Description</th>
            <th className="tableHead-cell">Owner</th>
            <th className="tableHead-cell">Usage</th>
          </>
        );
      }
      case ServiceCategory.MESSAGING_SERVICES: {
        return (
          <>
            <th className="tableHead-cell">Topic Name</th>
            <th className="tableHead-cell">Description</th>
            <th className="tableHead-cell">Owner</th>
            <th className="tableHead-cell">Tags</th>
          </>
        );
      }
      case ServiceCategory.DASHBOARD_SERVICES: {
        return (
          <>
            <th className="tableHead-cell">Dashboard Name</th>
            <th className="tableHead-cell">Description</th>
            <th className="tableHead-cell">Owner</th>
            <th className="tableHead-cell">Tags</th>
          </>
        );
      }
      case ServiceCategory.PIPELINE_SERVICES: {
        return (
          <>
            <th className="tableHead-cell">Pipeline Name</th>
            <th className="tableHead-cell">Description</th>
            <th className="tableHead-cell">Owner</th>
            <th className="tableHead-cell">Tags</th>
          </>
        );
      }
      default:
        return <></>;
    }
  };

  const getOptionalTableCells = (data: Database | Topic) => {
    switch (serviceName) {
      case ServiceCategory.DATABASE_SERVICES: {
        const database = data as Database;

        return (
          <td className="tableBody-cell">
            <p>
              {getUsagePercentile(
                database.usageSummary?.weeklyStats?.percentileRank || 0
              )}
            </p>
          </td>
        );
      }
      case ServiceCategory.MESSAGING_SERVICES: {
        const topic = data as Topic;

        return (
          <td className="tableBody-cell">
            {topic.tags && topic.tags?.length > 0
              ? topic.tags.map((tag, tagIndex) => (
                  <Tags
                    className="tw-bg-gray-200"
                    key={tagIndex}
                    startWith="#"
                    tag={{
                      ...tag,
                      tagFQN: `${
                        tag.tagFQN?.startsWith('Tier.Tier')
                          ? tag.tagFQN.split('.')[1]
                          : tag.tagFQN
                      }`,
                    }}
                  />
                ))
              : '--'}
          </td>
        );
      }
      case ServiceCategory.DASHBOARD_SERVICES: {
        const dashboard = data as Dashboard;

        return (
          <td className="tableBody-cell">
            {dashboard.tags && dashboard.tags?.length > 0
              ? dashboard.tags.map((tag, tagIndex) => (
                  <Tags
                    className="tw-bg-gray-200"
                    key={tagIndex}
                    startWith="#"
                    tag={{
                      ...tag,
                      tagFQN: `${
                        tag.tagFQN?.startsWith('Tier.Tier')
                          ? tag.tagFQN.split('.')[1]
                          : tag.tagFQN
                      }`,
                    }}
                  />
                ))
              : '--'}
          </td>
        );
      }
      case ServiceCategory.PIPELINE_SERVICES: {
        const pipeline = data as Pipeline;

        return (
          <td className="tableBody-cell">
            {pipeline.tags && pipeline.tags?.length > 0
              ? pipeline.tags.map((tag, tagIndex) => (
                  <Tags
                    className="tw-bg-gray-200"
                    key={tagIndex}
                    startWith="#"
                    tag={{
                      ...tag,
                      tagFQN: `${
                        tag.tagFQN?.startsWith('Tier.Tier')
                          ? tag.tagFQN.split('.')[1]
                          : tag.tagFQN
                      }`,
                    }}
                  />
                ))
              : '--'}
          </td>
        );
      }
      default:
        return <></>;
    }
  };

  useEffect(() => {
    setServiceName(serviceCategory || getServiceCategoryFromType(serviceType));
  }, [serviceCategory, serviceType]);

  useEffect(() => {
    getServiceByFQN(serviceName, serviceFQN).then(
      (resService: AxiosResponse) => {
        const { description, serviceType } = resService.data;
        setServiceDetails(resService.data);
        setDescription(description);
        setSlashedTableName([
          {
            name: serviceFQN,
            url: '',
            imgSrc: serviceType ? serviceTypeLogo(serviceType) : undefined,
            activeTitle: true,
          },
        ]);
        getOtherDetails();
      }
    );
  }, [serviceFQN, serviceName]);

  const onCancel = () => {
    setIsEdit(false);
  };

  const onDescriptionUpdate = (updatedHTML: string) => {
    if (description !== updatedHTML && !isUndefined(serviceDetails)) {
      const { id } = serviceDetails;

      const updatedServiceDetails = {
        ...serviceDetails,
        description: updatedHTML,
      };

      updateService(serviceName, id, updatedServiceDetails)
        .then(() => {
          setDescription(updatedHTML);
          setServiceDetails(updatedServiceDetails);
          setIsEdit(false);
        })
        .catch((err: AxiosError) => {
          const errMsg = err.message || 'Something went wrong!';
          showToast({
            variant: 'error',
            body: errMsg,
          });
        });
    } else {
      setIsEdit(false);
    }
  };

  const onDescriptionEdit = (): void => {
    setIsEdit(true);
  };

  const pagingHandler = (cursorType: string) => {
    const pagingString = `&${cursorType}=${
      paging[cursorType as keyof typeof paging]
    }`;
    getOtherDetails(pagingString);
  };

  const getCountLabel = () => {
    switch (serviceName) {
      case ServiceCategory.DASHBOARD_SERVICES:
        return 'Dashboards';
      case ServiceCategory.MESSAGING_SERVICES:
        return 'Topics';
      case ServiceCategory.PIPELINE_SERVICES:
        return 'Pipelines';
      case ServiceCategory.DATABASE_SERVICES:
      default:
        return 'Databases';
    }
  };

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : (
        <PageContainer>
          <div className="tw-px-4" data-testid="service-page">
            <TitleBreadcrumb titleLinks={slashedTableName} />

            <div className="tw-flex tw-gap-1 tw-mb-2 tw-mt-1 tw-ml-7">
              {getOptionalFields()}
              <span>
                <span className="tw-text-grey-muted tw-font-normal">
                  Ingestion :
                </span>{' '}
                <span className="tw-pl-1 tw-font-normal">
                  {' '}
                  {serviceDetails?.ingestionSchedule?.repeatFrequency
                    ? getFrequencyTime(
                        serviceDetails.ingestionSchedule.repeatFrequency
                      )
                    : '--'}
                </span>
              </span>
              <span className="tw-mx-3 tw-text-grey-muted">•</span>
              <span>
                <span className="tw-text-grey-muted tw-font-normal">
                  {getCountLabel()} :
                </span>{' '}
                <span className="tw-pl-1 tw-font-normal">{instanceCount}</span>
              </span>
            </div>

            <div
              className="tw-my-3 tw-ml-2"
              data-testid="description-container">
              <Description
                description={description || ''}
                entityName={serviceFQN}
                isEdit={isEdit}
                onCancel={onCancel}
                onDescriptionEdit={onDescriptionEdit}
                onDescriptionUpdate={onDescriptionUpdate}
              />
            </div>

            <div className="tw-mt-4 tw-px-1" data-testid="table-container">
              <table
                className="tw-bg-white tw-w-full tw-mb-4"
                data-testid="database-tables">
                <thead>
                  <tr className="tableHead-row">{getTableHeaders()}</tr>
                </thead>
                <tbody className="tableBody">
                  {data.length > 0 ? (
                    data.map((dataObj, index) => (
                      <tr
                        className={classNames(
                          'tableBody-row',
                          !isEven(index + 1) ? 'odd-row' : null
                        )}
                        data-testid="column"
                        key={index}>
                        <td className="tableBody-cell">
                          <Link
                            to={getLinkForFqn(
                              dataObj.fullyQualifiedName || ''
                            )}>
                            {serviceName ===
                              ServiceCategory.DASHBOARD_SERVICES &&
                            (dataObj as Dashboard).displayName
                              ? (dataObj as Dashboard).displayName
                              : dataObj.name}
                          </Link>
                        </td>
                        <td className="tableBody-cell">
                          {dataObj.description ? (
                            <RichTextEditorPreviewer
                              markdown={dataObj.description}
                            />
                          ) : (
                            <span className="tw-no-description">
                              No description added
                            </span>
                          )}
                        </td>
                        <td className="tableBody-cell">
                          <p>{dataObj?.owner?.name || '--'}</p>
                        </td>
                        {getOptionalTableCells(dataObj)}
                      </tr>
                    ))
                  ) : (
                    <tr className="tableBody-row">
                      <td className="tableBody-cell tw-text-center" colSpan={4}>
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {Boolean(!isNil(paging.after) || !isNil(paging.before)) && (
              <NextPrevious paging={paging} pagingHandler={pagingHandler} />
            )}
          </div>
        </PageContainer>
      )}
    </>
  );
};

export default ServicePage;
