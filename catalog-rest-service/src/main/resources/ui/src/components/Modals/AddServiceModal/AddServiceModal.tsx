/*
  * Licensed to the Apache Software Foundation (ASF) under one or more
  * contributor license agreements. See the NOTICE file distributed with
  * this work for additional information regarding copyright ownership.
  * The ASF licenses this file to You under the Apache License, Version 2.0
  * (the "License"); you may not use this file except in compliance with
  * the License. You may obtain a copy of the License at

  * http://www.apache.org/licenses/LICENSE-2.0

  * Unless required by applicable law or agreed to in writing, software
  * distributed under the License is distributed on an "AS IS" BASIS,
  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  * See the License for the specific language governing permissions and
  * limitations under the License.
*/

import classNames from 'classnames';
import { ServiceTypes } from 'Models';
import React, { FunctionComponent, useEffect, useRef, useState } from 'react';
import { serviceTypes } from '../../../constants/services.const';
import {
  MessagingServiceType,
  ServiceCategory,
} from '../../../enums/service.enum';
import { fromISOString } from '../../../utils/ServiceUtils';
import { Button } from '../../buttons/Button/Button';
import MarkdownWithPreview from '../../common/editor/MarkdownWithPreview';
// import { serviceType } from '../../../constants/services.const';

export type DataObj = {
  description: string | undefined;
  ingestionSchedule:
    | {
        repeatFrequency: string;
        startDate: string;
      }
    | undefined;
  name: string;
  serviceType: string;
  jdbc?: {
    connectionUrl: string;
    driverClass: string;
  };
  brokers?: Array<string>;
  schemaRegistry?: string;
};

type DatabaseService = {
  connectionUrl: string;
  driverClass: string;
  jdbc: { driverClass: string; connectionUrl: string };
};

type MessagingService = {
  brokers: Array<string>;
  schemaRegistry: string;
};

export type ServiceDataObj = {
  description: string;
  href: string;
  id: string;
  name: string;
  serviceType: string;
  ingestionSchedule?: { repeatFrequency: string; startDate: string };
} & Partial<DatabaseService> &
  Partial<MessagingService>;

export type EditObj = {
  edit: boolean;
  id?: string;
};

type Props = {
  header: string;
  serviceName: ServiceTypes;
  serviceList: Array<ServiceDataObj>;
  data?: ServiceDataObj;
  onSave: (obj: DataObj, text: string, editData: EditObj) => void;
  onCancel: () => void;
};

type ErrorMsg = {
  selectService: boolean;
  name: boolean;
  url?: boolean;
  // port: boolean;
  // userName: boolean;
  // password: boolean;
  driverClass?: boolean;
  broker?: boolean;
};
type EditorContentRef = {
  getEditorContent: () => string;
};

const requiredField = (label: string) => (
  <>
    {label} <span className="tw-text-red-500">&nbsp;*</span>
  </>
);

const generateOptions = (count: number, initialValue = 0) => {
  return Array(count)
    .fill(null)
    .map((_, i) => (
      <option key={i + initialValue} value={i + initialValue}>
        {i + initialValue}
      </option>
    ));
};

const generateName = (data: Array<ServiceDataObj>) => {
  const newArr: string[] = [];
  data.forEach((d) => {
    newArr.push(d.name);
  });

  return newArr;
};

const seprateUrl = (url?: string) => {
  if (url) {
    const urlString = url?.split('://')[1] || url;
    // const [idpwd, urlport] = urlString.split('@');
    // const [userName, password] = idpwd.split(':');
    // const [path, portwarehouse] = urlport.split(':');
    // const [port, database] = portwarehouse.split('/');

    const database = urlString?.split('/')[1];
    const connectionUrl = url.replace(`/${database}`, '');
    // return { userName, password, path, port, database };

    return { connectionUrl, database };
  }

  return {};
};

const errorMsg = (value: string) => {
  return (
    <div className="tw-mt-1">
      <strong className="tw-text-red-500 tw-text-xs tw-italic">{value}</strong>
    </div>
  );
};

export const AddServiceModal: FunctionComponent<Props> = ({
  header,
  serviceName,
  data,
  onSave,
  onCancel,
  serviceList,
}: Props) => {
  const [editData] = useState({ edit: !!data, id: data?.id });
  const [serviceType, setServiceType] = useState(
    serviceTypes[serviceName] || []
  );
  const [parseUrl] = useState(seprateUrl(data?.connectionUrl) || {});
  const [existingNames] = useState(generateName(serviceList));
  const [ingestion, setIngestion] = useState(!!data?.ingestionSchedule);
  const [selectService, setSelectService] = useState(data?.serviceType || '');
  const [name, setName] = useState(data?.name || '');
  // const [userName, setUserName] = useState(parseUrl?.userName || '');
  // const [password, setPassword] = useState(parseUrl?.password || '');
  // const [tags, setTags] = useState('');
  const [url, setUrl] = useState(parseUrl?.connectionUrl || '');
  // const [port, setPort] = useState(parseUrl?.port || '');
  const [database, setDatabase] = useState(parseUrl?.database || '');
  const [driverClass, setDriverClass] = useState(data?.driverClass || 'jdbc');
  const [brokers, setBrokers] = useState(
    data?.brokers?.length ? data.brokers.join(', ') : ''
  );
  const [schemaRegistry, setSchemaRegistry] = useState(
    data?.schemaRegistry || ''
  );
  const [frequency, setFrequency] = useState(
    fromISOString(data?.ingestionSchedule?.repeatFrequency)
  );
  const [showErrorMsg, setShowErrorMsg] = useState<ErrorMsg>({
    selectService: false,
    name: false,
    url: false,
    // port: false,
    // userName: false,
    // password: false,
    driverClass: false,
    broker: false,
  });
  const [sameNameError, setSameNameError] = useState(false);
  const markdownRef = useRef<EditorContentRef>();

  const getBrokerUrlPlaceholder = (): string => {
    return selectService === MessagingServiceType.PULSAR
      ? 'eg.: hostname:port'
      : 'eg.: hostname1:port1, hostname2:port2';
  };

  const handleChangeFrequency = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const name = event.target.name,
      value = +event.target.value;
    setFrequency({ ...frequency, [name]: value });
  };

  const handleValidation = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = event.target.value;
    const name = event.target.name;

    switch (name) {
      case 'selectService':
        setSelectService(value);

        break;

      case 'name':
        if (existingNames.includes(value.trim())) {
          setSameNameError(true);
        } else {
          setSameNameError(false);
        }
        setName(value);

        break;

      case 'url':
        setUrl(value);

        break;

      // case 'port':
      //   setPort(value);

      //   break;

      // case 'userName':
      //   setUserName(value);

      //   break;

      // case 'password':
      //   setPassword(value);

      //   break;

      case 'driverClass':
        setDriverClass(value);

        break;

      default:
        break;
    }

    setShowErrorMsg({ ...showErrorMsg, [name]: false });
  };

  const onSaveHelper = (value: ErrorMsg) => {
    const { selectService, name, url, driverClass, broker } = value;

    return (
      !sameNameError &&
      !selectService &&
      !name &&
      !url &&
      // !port &&
      // !userName &&
      // !password &&
      !driverClass &&
      !broker
    );
  };

  const handleSave = () => {
    let setMsg: ErrorMsg = {
      selectService: !selectService,
      name: !name,
    };
    switch (serviceName) {
      case ServiceCategory.DATABASE_SERVICES:
        {
          setMsg = {
            ...setMsg,
            url: !url,
            // port: !port,
            // userName: !userName,
            // password: !password,
            driverClass: !driverClass,
          };
        }

        break;
      case ServiceCategory.MESSAGING_SERVICES:
        {
          setMsg = {
            ...setMsg,
            broker: !brokers,
          };
        }

        break;
      default:
        break;
    }
    setShowErrorMsg(setMsg);
    if (onSaveHelper(setMsg)) {
      const { day, hour, minute } = frequency;
      const date = new Date();
      let dataObj: DataObj = {
        description: markdownRef.current?.getEditorContent(),
        ingestionSchedule: ingestion
          ? {
              repeatFrequency: `P${day}DT${hour}H${minute}M`,
              startDate: date.toISOString(),
            }
          : undefined,
        name: name,
        serviceType: selectService,
      };
      switch (serviceName) {
        case ServiceCategory.DATABASE_SERVICES:
          {
            dataObj = {
              ...dataObj,
              jdbc: {
                connectionUrl: `${url}${database && '/' + database}`,
                driverClass: driverClass,
              },
            };
          }

          break;
        case ServiceCategory.MESSAGING_SERVICES:
          {
            dataObj = {
              ...dataObj,
              brokers:
                selectService === MessagingServiceType.PULSAR
                  ? [brokers]
                  : brokers.split(',').map((broker) => broker.trim()),
              schemaRegistry: schemaRegistry,
            };
          }

          break;
        default:
          break;
      }
      onSave(dataObj, serviceName, editData);
    }
  };

  const getDatabaseFields = (): JSX.Element => {
    return (
      <>
        <div className="tw-mt-4 tw-grid tw-grid-cols-3 tw-gap-2 ">
          <div className="tw-col-span-3">
            <label className="tw-block tw-form-label" htmlFor="url">
              {requiredField('Connection Url:')}
            </label>
            <input
              className="tw-form-inputs tw-px-3 tw-py-1"
              id="url"
              name="url"
              placeholder="eg.: username:password@hostname:port"
              type="text"
              value={url}
              onChange={handleValidation}
            />
            {showErrorMsg.url && errorMsg('Connection url is required')}
          </div>

          {/* didn't removed below code as it will be need in future relase */}

          {/* <div>
                <label className="tw-block tw-form-label" htmlFor="port">
                  {requiredField('Connection Port:')}
                </label>
                <input
                  className="tw-form-inputs tw-px-3 tw-py-1"
                  id="port"
                  name="port"
                  type="number"
                  value={port}
                  onChange={handleValidation}
                />
                {showErrorMsg.port && errorMsg('Port is required')}
              </div> */}
        </div>
        {/* <div className="tw-mt-4 tw-grid tw-grid-cols-2 tw-gap-2 ">
              <div>
                <label className="tw-block tw-form-label" htmlFor="userName">
                  {requiredField('Username:')}
                </label>
                <input
                  className="tw-form-inputs tw-px-3 tw-py-1"
                  id="userName"
                  name="userName"
                  type="text"
                  value={userName}
                  onChange={handleValidation}
                />
                {showErrorMsg.userName && errorMsg('Username is required')}
              </div>
              <div>
                <label className="tw-block tw-form-label" htmlFor="password">
                  {requiredField('Password:')}
                </label>
                <input
                  className="tw-form-inputs tw-px-3 tw-py-1"
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={handleValidation}
                />
                {showErrorMsg.password && errorMsg('Password is required')}
              </div>
            </div> */}
        <div className="tw-mt-4">
          <label className="tw-block tw-form-label" htmlFor="database">
            Database:
          </label>
          <input
            className="tw-form-inputs tw-px-3 tw-py-1"
            id="database"
            name="database"
            placeholder="Enter database name"
            type="text"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
          />
        </div>
        <div className="tw-mt-4">
          <label className="tw-block tw-form-label" htmlFor="driverClass">
            {requiredField('Driver Class:')}
          </label>
          {!editData.edit ? (
            <select
              className="tw-form-inputs tw-px-3 tw-py-1"
              id="driverClass"
              name="driverClass"
              value={driverClass}
              onChange={handleValidation}>
              <option value="jdbc">jdbc</option>
            </select>
          ) : (
            <input
              disabled
              className="tw-form-inputs tw-px-3 tw-py-1 tw-cursor-not-allowed"
              id="driverClass"
              name="driverClass"
              value={driverClass}
            />
          )}
          {showErrorMsg.driverClass && errorMsg('Driver class is required')}
        </div>
      </>
    );
  };

  const getMessagingFields = (): JSX.Element => {
    return (
      <>
        <div className="tw-mt-4">
          <label className="tw-block tw-form-label" htmlFor="broker">
            {requiredField('Broker Url:')}
          </label>
          <input
            className="tw-form-inputs tw-px-3 tw-py-1"
            id="broker"
            name="broker"
            placeholder={getBrokerUrlPlaceholder()}
            type="text"
            value={brokers}
            onChange={(e) => setBrokers(e.target.value)}
          />
          {showErrorMsg.broker && errorMsg('Broker url is required')}
        </div>
        <div className="tw-mt-4">
          <label className="tw-block tw-form-label" htmlFor="schema-registry">
            Schema Registry:
          </label>
          <input
            className="tw-form-inputs tw-px-3 tw-py-1"
            id="schema-registry"
            name="schema-registry"
            placeholder="eg.: hostname:port"
            type="text"
            value={schemaRegistry}
            onChange={(e) => setSchemaRegistry(e.target.value)}
          />
        </div>
      </>
    );
  };

  const getOptionalFields = (): JSX.Element => {
    switch (serviceName) {
      case ServiceCategory.DATABASE_SERVICES:
        return getDatabaseFields();
      case ServiceCategory.MESSAGING_SERVICES:
        return getMessagingFields();
      default:
        return <></>;
    }
  };

  useEffect(() => {
    setServiceType(serviceTypes[serviceName] || []);
  }, [serviceName]);

  return (
    <dialog className="tw-modal">
      <div className="tw-modal-backdrop" />
      <div className="tw-modal-container tw-max-w-lg">
        <div className="tw-modal-header">
          <p className="tw-modal-title">{header}</p>
        </div>
        <div className="tw-modal-body">
          <form className="tw-min-w-full">
            <div>
              <label className="tw-block tw-form-label" htmlFor="selectService">
                {requiredField('Select Service:')}
              </label>
              {!editData.edit ? (
                <select
                  className="tw-form-inputs tw-px-3 tw-py-1"
                  id="selectService"
                  name="selectService"
                  value={selectService}
                  onChange={handleValidation}>
                  <option value="">Select Service</option>
                  {serviceType.map((service, index) => (
                    <option key={index} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  disabled
                  className="tw-form-inputs tw-px-3 tw-py-1 tw-cursor-not-allowed"
                  id="selectService"
                  name="selectService"
                  value={selectService}
                />
              )}
              {showErrorMsg.selectService &&
                errorMsg('Select service is required')}
            </div>
            <div className="tw-mt-4">
              <label className="tw-block tw-form-label" htmlFor="name">
                {requiredField('Service Name:')}
              </label>
              {!editData.edit ? (
                <input
                  className="tw-form-inputs tw-px-3 tw-py-1"
                  id="name"
                  name="name"
                  placeholder="Enter service name"
                  type="text"
                  value={name}
                  onChange={handleValidation}
                />
              ) : (
                <input
                  disabled
                  className="tw-form-inputs tw-px-3 tw-py-1 tw-cursor-not-allowed"
                  id="name"
                  name="name"
                  value={name}
                />
              )}
              {showErrorMsg.name && errorMsg('Service name is required.')}
              {sameNameError && errorMsg('Service name already exist.')}
            </div>
            {getOptionalFields()}
            <div className="tw-mt-4">
              <label className="tw-block tw-form-label" htmlFor="description">
                Description:
              </label>
              <MarkdownWithPreview
                ref={markdownRef}
                value={data?.description || ''}
              />
            </div>
            <div className="tw-mt-4 tw-flex tw-items-center">
              <label className="tw-form-label tw-mb-0">Enable Ingestion</label>
              <div
                className={classNames(
                  'toggle-switch',
                  ingestion ? 'open' : null
                )}
                onClick={() => setIngestion(!ingestion)}>
                <div className="switch" />
              </div>
            </div>
            {ingestion && (
              <div className="tw-grid tw-grid-cols-3 tw-gap-2 tw-gap-y-0 tw-mt-4">
                <div className="tw-col-span-3">
                  <label className="tw-block tw-form-label" htmlFor="frequency">
                    Frequency:
                  </label>
                </div>
                <div className="tw-flex tw-items-center ">
                  <label
                    className="tw-form-label tw-mb-0 tw-text-xs flex-auto tw-mr-2"
                    htmlFor="frequency">
                    Day:
                  </label>
                  <select
                    className="tw-form-inputs tw-px-3 tw-py-1 flex-auto"
                    id="frequency"
                    name="day"
                    value={frequency.day}
                    onChange={handleChangeFrequency}>
                    {generateOptions(365, 1)}
                  </select>
                </div>
                <div className="tw-flex tw-items-center">
                  <label
                    className="tw-form-label tw-mb-0 tw-text-xs tw-mx-2"
                    htmlFor="frequency">
                    Hour:
                  </label>
                  <select
                    className="tw-form-inputs tw-px-3 tw-py-1"
                    id="hour"
                    name="hour"
                    value={frequency.hour}
                    onChange={handleChangeFrequency}>
                    {generateOptions(24)}
                  </select>
                </div>
                <div className="tw-flex tw-items-center">
                  <label
                    className="tw-form-label tw-mb-0 tw-text-xs tw-mx-2"
                    htmlFor="frequency">
                    Minute:
                  </label>
                  <select
                    className="tw-form-inputs tw-px-3 tw-py-1 "
                    id="minute"
                    name="minute"
                    value={frequency.minute}
                    onChange={handleChangeFrequency}>
                    {generateOptions(60)}
                  </select>
                </div>
              </div>
            )}
          </form>
        </div>
        <div className="tw-modal-footer tw-justify-end">
          <Button
            className="tw-mr-2"
            size="regular"
            theme="primary"
            variant="text"
            onClick={onCancel}>
            Discard
          </Button>
          <Button
            size="regular"
            theme="primary"
            type="submit"
            variant="contained"
            onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </dialog>
  );
};
