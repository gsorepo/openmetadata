import classNames from 'classnames';
import { ColumnTags } from 'Models';
import React from 'react';
import { LIST_SIZE } from '../../../constants/constants';
import Tags from '../../tags/tags';
import PopOver from '../popover/PopOver';
import TitleBreadcrumb from '../title-breadcrumb/title-breadcrumb.component';
import { TitleBreadcrumbProps } from '../title-breadcrumb/title-breadcrumb.interface';

type ExtraInfo = {
  key: string;
  value: string;
};

type Props = {
  titleLinks: TitleBreadcrumbProps['titleLinks'];
  isFollowing: boolean;
  followHandler: () => void;
  followers: number;
  extraInfo: Array<ExtraInfo>;
  tier: string;
  tags: Array<ColumnTags>;
};

const EntityPageInfo = ({
  titleLinks,
  isFollowing,
  followHandler,
  followers,
  extraInfo,
  tier,
  tags,
}: Props) => {
  return (
    <div>
      <div className="tw-flex tw-flex-col">
        <div className="tw-flex tw-flex-initial tw-justify-between tw-items-center">
          <TitleBreadcrumb titleLinks={titleLinks} />
          <div className="tw-flex tw-h-6 tw-ml-2 tw-mt-2">
            <span
              className={classNames(
                'tw-flex tw-border tw-border-primary tw-rounded',
                isFollowing ? 'tw-bg-primary tw-text-white' : 'tw-text-primary'
              )}>
              <button
                className={classNames(
                  'tw-text-xs tw-border-r tw-font-normal tw-py-1 tw-px-2 tw-rounded-l focus:tw-outline-none',
                  isFollowing ? 'tw-border-white' : 'tw-border-primary'
                )}
                data-testid="follow-button"
                onClick={followHandler}>
                {isFollowing ? (
                  <>
                    <i className="fas fa-star" /> Unfollow
                  </>
                ) : (
                  <>
                    <i className="far fa-star" /> Follow
                  </>
                )}
              </button>
              <span className="tw-text-xs tw-border-l-0 tw-font-normal tw-py-1 tw-px-2 tw-rounded-r">
                {followers}
              </span>
            </span>
          </div>
        </div>
      </div>
      <div className="tw-flex tw-gap-1 tw-mb-2 tw-mt-1">
        {extraInfo.map((info, index) => (
          <span key={index}>
            <span className="tw-text-grey-muted tw-font-normal">
              {info.key} :
            </span>{' '}
            <span className="tw-pl-1tw-font-normal ">{info.value || '--'}</span>
            {extraInfo.length !== 1 && index < extraInfo.length - 1 ? (
              <span className="tw-mx-3 tw-inline-block tw-text-gray-400">
                •
              </span>
            ) : null}
          </span>
        ))}
      </div>
      <div className="tw-flex tw-flex-wrap tw-pt-1">
        {(tags.length > 0 || tier) && (
          <i className="fas fa-tags tw-px-1 tw-mt-2 tw-text-grey-muted" />
        )}
        {tier && (
          <Tags className="tw-bg-gray-200" tag={`#${tier.split('.')[1]}`} />
        )}
        {tags.length > 0 && (
          <>
            {tags.slice(0, LIST_SIZE).map((tag, index) => (
              <Tags
                className="tw-bg-gray-200"
                key={index}
                tag={`#${tag.tagFQN}`}
              />
            ))}

            {tags.slice(LIST_SIZE).length > 0 && (
              <PopOver
                className="tw-py-1"
                html={
                  <>
                    {tags.slice(LIST_SIZE).map((tag, index) => (
                      <Tags
                        className="tw-bg-gray-200 tw-px-2"
                        key={index}
                        tag={`#${tag.tagFQN}`}
                      />
                    ))}
                  </>
                }
                position="bottom"
                theme="light"
                trigger="click">
                <span className="tw-cursor-pointer tw-text-xs link-text">
                  View more
                </span>
              </PopOver>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EntityPageInfo;
