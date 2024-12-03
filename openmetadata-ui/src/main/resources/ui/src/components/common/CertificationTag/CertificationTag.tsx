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
import { Tag, Tooltip } from 'antd';
import React from 'react';
import { AssetCertification } from '../../../generated/entity/data/table';
import { getEntityName } from '../../../utils/EntityUtils';
import { getTagImageSrc, getTagTooltip } from '../../../utils/TagsUtils';
import './certification-tag.less';

const CertificationTag = ({
  certification,
}: {
  certification: AssetCertification;
}) => {
  if (certification.tagLabel.style?.iconURL) {
    const name = getEntityName(certification.tagLabel);
    const tagSrc = getTagImageSrc(certification.tagLabel.style.iconURL);

    return (
      <Tooltip
        className="cursor-pointer"
        title={getTagTooltip(name, certification.tagLabel.description)}
        trigger="hover">
        <div data-testid={`certification-${certification.tagLabel.tagFQN}`}>
          <img alt={`certification: ${name}`} src={tagSrc} />
        </div>
      </Tooltip>
    );
  }

  return (
    <Tag
      className="certification-tag"
      data-testid={`certification-${certification.tagLabel.tagFQN}`}
      style={{
        borderColor: certification.tagLabel.style?.color,
        backgroundColor: certification.tagLabel.style?.color
          ? `${certification.tagLabel.style.color}33`
          : undefined, // Assuming 33 is the hex transparency for lighter shade
      }}>
      {getEntityName(certification.tagLabel)}
    </Tag>
  );
};

export default CertificationTag;
