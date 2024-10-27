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

import { Select } from 'antd';
import { isUndefined, toNumber, toString } from 'lodash';
import React from 'react';
import {
  Combination,
  CronOption,
  StateValue,
  WorkflowExtraConfig,
} from '../components/Settings/Services/AddIngestion/Steps/ScheduleInterval.interface';
import {
  CRON_COMBINATIONS,
  DEFAULT_SCHEDULE_CRON_DAILY,
  DEFAULT_SCHEDULE_CRON_HOURLY,
  DEFAULT_SCHEDULE_CRON_MONTHLY,
  DEFAULT_SCHEDULE_CRON_WEEKLY,
} from '../constants/Schedular.constants';
import { CronTypes } from '../enums/Schedular.enum';

export const getScheduleOptionsFromSchedules = (
  scheduleOptions: string[]
): string[] => {
  return scheduleOptions.map((scheduleOption) => {
    switch (scheduleOption) {
      case 'run_once':
        return '';
      case 'hourly':
        return 'hour';
      case 'daily':
        return 'day';
      case 'weekly':
        return 'week';
      case 'monthly':
        return 'month';
    }

    return '';
  });
};

export const getRange = (n: number) => {
  return [...Array(n).keys()];
};

export const getRangeOptions = (n: number) => {
  return getRange(n).map((v) => {
    return {
      label: `0${v}`.slice(-2),
      value: toString(v),
    };
  });
};

export const getMinuteOptions = () => {
  return getRangeOptions(60);
};

export const getHourOptions = () => {
  return getRangeOptions(24);
};

export const getMinuteCron = (value: Partial<StateValue>) => {
  return `*/${value.min} * * * *`;
};

export const getHourCron = (value: Partial<StateValue>) => {
  return `${value.min} * * * *`;
};

export const getDayCron = (value: Partial<StateValue>) => {
  return `${value.min} ${value.hour} * * *`;
};

export const getWeekCron = (value: Partial<StateValue>) => {
  return `${value.min} ${value.hour} * * ${value.dow}`;
};

export const getMonthCron = (value: Partial<StateValue>) => {
  return `${value.min} ${value.hour} ${value.dom} * ${value.dow}`;
};

export const getCron = (state: StateValue) => {
  const { selectedPeriod, cron } = state;

  switch (selectedPeriod) {
    case 'hour':
      return getHourCron(state);
    case 'day':
      return getDayCron(state);
    case 'week':
      return getWeekCron(state);
    case 'month':
      return getMonthCron(state);
    default:
      return cron;
  }
};

const getCronType = (cronStr: string) => {
  for (const c in CRON_COMBINATIONS) {
    if (CRON_COMBINATIONS[c as keyof Combination].test(cronStr)) {
      return c;
    }
  }

  return 'custom';
};

export const getStateValue = (value?: string, defaultValue?: string) => {
  const a = value?.split(' ');
  const d = a ?? defaultValue?.split(' ') ?? [];

  const min = d[0];
  const hour = d[1];
  const dom = d[2];
  const dow = d[4];

  const cronType = getCronType(value ?? defaultValue ?? '');

  const stateVal: StateValue = {
    selectedPeriod: cronType,
    cron: value,
    min,
    hour,
    dow,
    dom,
  };

  return stateVal;
};

export const getCronDefaultValue = (appName: string) => {
  const value = {
    min: '0',
    hour: '0',
  };

  let initialValue = getDayCron(value);

  if (appName === 'DataInsightsReportApplication') {
    initialValue = getWeekCron({ ...value, dow: '0' });
  }

  return initialValue;
};

const getOptionComponent = () => {
  const optionRenderer = (o: CronOption) => {
    return { label: o.label, value: o.value };
  };

  return optionRenderer;
};

export const getHourMinuteSelect = ({
  cronType,
  disabled = false,
}: {
  cronType: CronTypes.MINUTE | CronTypes.HOUR;
  disabled?: boolean;
}) => (
  <Select
    className="w-full"
    data-testid={`${cronType}-options`}
    disabled={disabled}
    id={`${cronType}-select`}
    options={
      cronType === CronTypes.MINUTE
        ? getMinuteOptions().map(getOptionComponent())
        : getHourOptions().map(getOptionComponent())
    }
  />
);

export const getDefaultScheduleValue = ({
  defaultSchedule,
  includePeriodOptions,
  allowNoSchedule = false,
}: {
  defaultSchedule?: string;
  includePeriodOptions?: string[];
  allowNoSchedule?: boolean;
}) => {
  if (isUndefined(includePeriodOptions)) {
    return allowNoSchedule
      ? defaultSchedule
      : defaultSchedule || DEFAULT_SCHEDULE_CRON_DAILY;
  }

  // In case of include periodOptions are present
  // but the default schedule is undefined and allowNoSchedule is true
  // return the default schedule
  if (allowNoSchedule && isUndefined(defaultSchedule)) {
    return defaultSchedule;
  }

  return getDefaultScheduleFromPeriod(includePeriodOptions);
};

export const getDefaultScheduleFromPeriod = (
  includePeriodOptions: string[]
) => {
  // By order, return the default schedule as day, week, month and hour as a last resort
  // if none of the previous options are included
  if (includePeriodOptions.includes('day')) {
    return DEFAULT_SCHEDULE_CRON_DAILY;
  } else if (includePeriodOptions.includes('week')) {
    return DEFAULT_SCHEDULE_CRON_WEEKLY;
  } else if (includePeriodOptions.includes('month')) {
    return DEFAULT_SCHEDULE_CRON_MONTHLY;
  } else if (includePeriodOptions.includes('hour')) {
    return DEFAULT_SCHEDULE_CRON_HOURLY;
  }

  // return the fallback schedule as daily
  return DEFAULT_SCHEDULE_CRON_DAILY;
};

// Function to update return updated state from form values
export const getUpdatedStateFromFormState = <T,>(
  currentState: StateValue,
  formValues: StateValue & WorkflowExtraConfig & T
) => {
  try {
    const newState = { ...currentState, ...formValues };
    let { min, hour, dow, dom } = newState;

    // min, hour values in a state should be a string
    // which can be parsed to number to be a valid values for the
    // respective cron select fields.
    min = isNaN(toNumber(min)) ? '0' : min;
    hour = isNaN(toNumber(hour)) ? '0' : hour;
    const cronValue = newState.cron?.split(' ');

    switch (newState.selectedPeriod) {
      case 'week':
        // For selected period week, dow should be a valid value i.e. a number string
        // and the dom should be '*'
        dow = isNaN(toNumber(dow)) ? '1' : dow;
        dom = '*';

        break;
      case 'month':
        // For selected period month, dom should be a valid value i.e. a number string
        // and the dow should be '*'
        dom = isNaN(toNumber(dom)) ? '1' : dom;
        dow = '*';

        break;
      case 'custom':
        // For selected period custom, change the min, hour, dom and dow values
        // to the values parsed from the cron string
        min = cronValue?.[0] ?? '0';
        hour = cronValue?.[1] ?? '0';
        dom = cronValue?.[2] ?? '*';
        dow = cronValue?.[4] ?? '*';

        break;
    }

    return {
      ...newState,
      min,
      hour,
      dow,
      dom,
    };
  } catch {
    return { ...currentState, ...formValues };
  }
};
