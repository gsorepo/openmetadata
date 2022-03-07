import { AxiosError, AxiosResponse } from 'axios';
import { Paging } from 'Models';
import React, { useEffect, useState } from 'react';
import { getGlossaries } from '../../axiosAPIs/glossaryAPI';
import PageContainerV1 from '../../components/containers/PageContainerV1';
import GlossaryComponent from '../../components/Glossary/Glossary.component';
import Loader from '../../components/Loader/Loader';
import { pagingObject } from '../../constants/constants';
import { Glossary } from '../../generated/entity/data/glossary';
import useToastContext from '../../hooks/useToastContext';

const GlossaryPage = () => {
  const showToast = useToastContext();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [paging, setPaging] = useState<Paging>(pagingObject);
  const [glossariesList, setGlossariesList] = useState<Array<Glossary>>([]);

  const fetchData = (pagin = '') => {
    setIsLoading(true);
    getGlossaries(pagin, ['owner', 'tags', 'reviewers'])
      .then((res: AxiosResponse) => {
        if (res.data?.data) {
          setGlossariesList(res.data.data);
          setPaging(res.data.paging);
        } else {
          setGlossariesList([]);
          setPaging(pagingObject);
        }
      })
      .catch((err: AxiosError) => {
        showToast({
          variant: 'error',
          body: err.message || 'Something went wrong!',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handlePageChange = (cursorType: string) => {
    const pagingString = `&${cursorType}=${
      paging[cursorType as keyof typeof paging]
    }`;
    fetchData(pagingString);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <PageContainerV1 className="tw-pt-4">
      {isLoading ? (
        <Loader />
      ) : (
        <GlossaryComponent
          data={glossariesList}
          paging={paging}
          onPageChange={handlePageChange}
        />
      )}
    </PageContainerV1>
  );
};

export default GlossaryPage;
