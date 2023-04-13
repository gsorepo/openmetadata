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
import { AssetSelectionModal } from 'components/Assets/AssetsSelectionModal/AssetSelectionModal';
import { EntityDetailsObjectInterface } from 'components/Explore/explore.interface';
import GlossaryHeader from 'components/Glossary/GlossaryHeader/GlossaryHeader.component';
import GlossaryTabs from 'components/GlossaryTabs/GlossaryTabs.component';
import { myDataSearchIndex } from 'constants/Mydata.constants';
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { searchData } from 'rest/miscAPI';
import { GlossaryTerm } from '../../generated/entity/data/glossaryTerm';
import { OperationPermission } from '../PermissionProvider/PermissionProvider.interface';
import { AssetsTabRef } from './tabs/AssetsTabs.component';

type Props = {
  permissions: OperationPermission;
  glossaryTerm: GlossaryTerm;
  childGlossaryTerms: GlossaryTerm[];
  handleGlossaryTermUpdate: (data: GlossaryTerm) => Promise<void>;
  handleGlossaryTermDelete: (id: string) => void;
  refreshGlossaryTerms: () => void;
  onAssetClick?: (asset?: EntityDetailsObjectInterface) => void;
  isSummaryPanelOpen: boolean;
};

const GlossaryTermsV1 = ({
  glossaryTerm,
  childGlossaryTerms,
  handleGlossaryTermUpdate,
  handleGlossaryTermDelete,
  permissions,
  refreshGlossaryTerms,
  onAssetClick,
  isSummaryPanelOpen,
}: Props) => {
  const { glossaryName: glossaryFqn } = useParams<{ glossaryName: string }>();
  const assetTabRef = useRef<AssetsTabRef>(null);
  const [assetModalVisible, setAssetModelVisible] = useState(false);

  const [assetCount, setAssetCount] = useState<number>(0);

  const fetchGlossaryTermAssets = async () => {
    if (glossaryFqn) {
      try {
        const res = await searchData(
          '',
          1,
          0,
          `(tags.tagFQN:"${glossaryFqn}")`,
          '',
          '',
          myDataSearchIndex
        );

        setAssetCount(res.data.hits.total.value ?? 0);
      } catch (error) {
        setAssetCount(0);
      }
    }
  };

  useEffect(() => {
    fetchGlossaryTermAssets();
  }, [glossaryFqn]);

  const handleAssetSave = () => {
    fetchGlossaryTermAssets();
    assetTabRef.current?.refreshAssets();
  };

  return (
    <>
      <Row data-testid="glossary-term" gutter={[0, 8]}>
        <Col span={24}>
          <GlossaryHeader
            isGlossary={false}
            permissions={permissions}
            selectedData={glossaryTerm}
            onAssetAdd={() => setAssetModelVisible(true)}
            onDelete={handleGlossaryTermDelete}
            onUpdate={(data) => handleGlossaryTermUpdate(data as GlossaryTerm)}
          />
        </Col>

        <Col span={24}>
          <GlossaryTabs
            assetCount={assetCount}
            assetsRef={assetTabRef}
            childGlossaryTerms={childGlossaryTerms}
            isGlossary={false}
            isSummaryPanelOpen={isSummaryPanelOpen}
            permissions={permissions}
            refreshGlossaryTerms={refreshGlossaryTerms}
            selectedData={glossaryTerm}
            onAddAsset={() => setAssetModelVisible(true)}
            onAssetClick={onAssetClick}
            onUpdate={(data) => handleGlossaryTermUpdate(data as GlossaryTerm)}
          />
        </Col>
      </Row>
      {glossaryTerm.fullyQualifiedName && (
        <AssetSelectionModal
          glossaryFQN={glossaryTerm.fullyQualifiedName}
          open={assetModalVisible}
          onCancel={() => setAssetModelVisible(false)}
          onSave={handleAssetSave}
        />
      )}
    </>
  );
};

export default GlossaryTermsV1;
