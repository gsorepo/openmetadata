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
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Carousel } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useSuggestionsContext } from '../../Suggestions/SuggestionsProvider/SuggestionsProvider';
import UserPopOverCard from '../PopOverCard/UserPopOverCard';
import ProfilePicture from '../ProfilePicture/ProfilePicture';
import './avatar-carousel.less';

const AvatarCarousel = () => {
  const { allSuggestionsUsers: avatarList, onUpdateActiveUser } =
    useSuggestionsContext();
  const [currentSlide, setCurrentSlide] = useState(-1);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === 0 ? avatarList.length - 1 : prev - 1));
  }, [avatarList]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === avatarList.length - 1 ? 0 : prev + 1));
  }, [avatarList]);

  const onProfileClick = useCallback(
    (index: number) => {
      const activeUser = avatarList[index];
      onUpdateActiveUser(activeUser);
    },
    [avatarList]
  );

  useEffect(() => {
    onProfileClick(currentSlide);
  }, [currentSlide]);

  return (
    <div className="avatar-carousel-container d-flex items-center">
      <Button
        className="carousel-arrow"
        data-testid="prev-slide"
        disabled={avatarList.length <= 1 || currentSlide <= 0}
        icon={<LeftOutlined />}
        size="small"
        type="text"
        onClick={prevSlide}
      />
      <Carousel
        afterChange={(current) => setCurrentSlide(current)}
        dots={false}
        slidesToShow={avatarList.length < 3 ? avatarList.length : 3}>
        {avatarList.map((avatar, index) => (
          <UserPopOverCard
            className=""
            key={avatar.id}
            userName={avatar?.name ?? ''}>
            <Button
              className={`p-0 m-r-xss avatar-item ${
                currentSlide === index ? 'active' : ''
              }`}
              shape="circle"
              onClick={() => setCurrentSlide(index)}>
              <ProfilePicture name={avatar.name ?? ''} width="30" />
            </Button>
          </UserPopOverCard>
        ))}
      </Carousel>
      <Button
        className="carousel-arrow"
        data-testid="next-slide"
        disabled={
          avatarList.length <= 1 || currentSlide === avatarList.length - 1
        }
        icon={<RightOutlined />}
        size="small"
        type="text"
        onClick={nextSlide}
      />
    </div>
  );
};

export default AvatarCarousel;
