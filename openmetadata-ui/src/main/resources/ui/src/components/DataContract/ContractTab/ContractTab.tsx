/*
 *  Copyright 2025 Collate.
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

import { useEffect, useMemo, useState } from 'react';
import { EntityType, TabSpecificField } from '../../../enums/entity.enum';
import { DataContract } from '../../../generated/entity/data/dataContract';
import {
  deleteContractById,
  getContractByEntityId,
} from '../../../rest/contractAPI';
import { showErrorToast, showSuccessToast } from '../../../utils/ToastUtils';
import { useGenericContext } from '../../Customization/GenericProvider/GenericProvider';
import AddDataContract from '../AddDataContract/AddDataContract';
import { ContractDetail } from '../ContractDetailTab/ContractDetail';

export const ContractTab = () => {
  const {
    data: { id },
  } = useGenericContext();
  const [tabMode, setTabMode] = useState<'add' | 'edit' | 'view'>('view');
  const [contract, setContract] = useState<DataContract | null>(null);

  const fetchContract = async () => {
    const contract = await getContractByEntityId(id, EntityType.TABLE, [
      TabSpecificField.OWNERS,
    ]);
    setContract(contract);
  };

  useEffect(() => {
    fetchContract();
  }, [id]);

  const handleDelete = () => {
    if (contract?.id) {
      deleteContractById(contract.id)
        .then(() => {
          showSuccessToast('Contract deleted successfully');
          fetchContract();
          setTabMode('view');
        })
        .catch((err) => {
          showErrorToast(err);
        });
    }
  };

  const content = useMemo(() => {
    switch (tabMode) {
      case 'add':
        return (
          <AddDataContract
            contract={contract || undefined}
            onCancel={() => {
              setTabMode('view');
            }}
            onSave={() => {
              fetchContract();
              setTabMode('view');
            }}
          />
        );

      case 'edit':
        return (
          <AddDataContract
            contract={contract || undefined}
            onCancel={() => {
              setTabMode('view');
            }}
            onSave={() => {
              fetchContract();
              setTabMode('view');
            }}
          />
        );

      case 'view':
        return (
          <ContractDetail
            contract={contract}
            onDelete={handleDelete}
            onEdit={() => {
              setTabMode(contract ? 'edit' : 'add');
            }}
          />
        );
    }
  }, [tabMode, contract]);

  return content;
};
