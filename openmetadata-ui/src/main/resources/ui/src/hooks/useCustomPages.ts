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
import { useEffect } from 'react';

import { useCallback, useState } from 'react';
import { FQN_SEPARATOR_CHAR } from '../constants/char.constants';
import { EntityType } from '../enums/entity.enum';
import { Page, PageType } from '../generated/system/ui/page';
import { getDocumentByFQN } from '../rest/DocStoreAPI';
import { useApplicationStore } from './useApplicationStore';

export const useCustomPages = (pageType: PageType) => {
  const { selectedPersona } = useApplicationStore();
  const [customizedPage, setCustomizedPage] = useState<Page | null>(null);

  const fetchDocument = useCallback(async () => {
    const pageFQN = `${EntityType.PERSONA}${FQN_SEPARATOR_CHAR}${selectedPersona.fullyQualifiedName}`;
    try {
      const doc = await getDocumentByFQN(pageFQN);
      setCustomizedPage(
        doc.data?.pages?.find((p: Page) => p.pageType === pageType)
      );
    } catch (error) {
      // fail silent
    }
  }, [selectedPersona.fullyQualifiedName, pageType]);

  useEffect(() => {
    if (selectedPersona?.fullyQualifiedName) {
      fetchDocument();
    }
  }, [selectedPersona, pageType]);

  return {
    customizedPage,
  };
};
