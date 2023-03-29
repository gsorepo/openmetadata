/*
 *  Copyright 2022 Collate.
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

import { Col, Row } from 'antd';
import GlossaryHeader from 'components/Glossary/GlossaryHeader/GlossaryHeader.component';
import GlossaryTermTab from 'components/Glossary/GlossaryTermTab/GlossaryTermTab.component';
import { GlossaryTerm } from 'generated/entity/data/glossaryTerm';
import React from 'react';
import { Glossary } from '../../generated/entity/data/glossary';
import { OperationPermission } from '../PermissionProvider/PermissionProvider.interface';
import './GlossaryDetails.style.less';

type props = {
  permissions: OperationPermission;
  glossary: Glossary;
  glossaryTerms: GlossaryTerm[];
  updateGlossary: (value: Glossary) => Promise<void>;
  handleGlossaryDelete: (id: string) => void;
};

const GlossaryDetails = ({
  permissions,
  glossary,
  updateGlossary,
  handleGlossaryDelete,
  glossaryTerms,
}: props) => {
  return (
    <Row data-testid="glossary-details" gutter={[0, 16]}>
      <Col span={24}>
        <GlossaryHeader
          isGlossary
          permissions={permissions}
          selectedData={glossary}
          onDelete={handleGlossaryDelete}
          onUpdate={updateGlossary}
        />
      </Col>

      <Col span={24}>
        <GlossaryTermTab
          childGlossaryTerms={glossaryTerms}
          glossaryId={glossary.id}
          selectedGlossaryFqn={glossary.fullyQualifiedName || glossary.name}
        />
      </Col>
    </Row>
  );
};

export default GlossaryDetails;
