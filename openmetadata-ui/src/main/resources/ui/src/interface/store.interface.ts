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
import { Theme } from 'antd/lib/config-provider/context';
import { ItemType } from 'antd/lib/menu/hooks/useItems';
import {
  AuthenticationConfigurationWithScope,
  IAuthContext,
  OidcUser,
} from '../components/Auth/AuthProviders/AuthProvider.interface';
import {
  EntityUnion,
  ExploreSearchIndex,
} from '../components/Explore/ExplorePage.interface';
import { AuthenticationConfiguration } from '../generated/configuration/authenticationConfiguration';
import { AuthorizerConfiguration } from '../generated/configuration/authorizerConfiguration';
import { LoginConfiguration } from '../generated/configuration/loginConfiguration';
import { LogoConfiguration } from '../generated/configuration/logoConfiguration';
import { Domain } from '../generated/entity/domains/domain';
import { User } from '../generated/entity/teams/user';
import { EntityReference } from '../generated/entity/type';

export interface HelperFunctions {
  onLoginHandler: () => void;
  onLogoutHandler: () => void;
  handleSuccessfulLogin: (user: OidcUser) => void;
  handleFailedLogin: () => void;
  updateAxiosInterceptors: () => void;
}

export interface ApplicationStore
  extends IAuthContext,
    LogoConfiguration,
    LoginConfiguration {
  userProfilePics: Record<string, User>;
  cachedEntityData: Record<string, EntityUnion>;
  urlPathName: string;
  selectedPersona: EntityReference;
  oidcIdToken: string;
  refreshTokenKey: string;
  authConfig?: AuthenticationConfigurationWithScope;
  applicationConfig?: LogoConfiguration;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resetTheme: () => void;
  searchCriteria: ExploreSearchIndex | '';
  setSelectedPersona: (persona: EntityReference) => void;
  setApplicationConfig: (config: LogoConfiguration) => void;
  setUrlPathName: (urlPathName: string) => void;
  setCurrentUser: (user: User) => void;
  setAuthConfig: (authConfig: AuthenticationConfigurationWithScope) => void;
  setAuthorizerConfig: (authorizerConfig: AuthorizerConfiguration) => void;
  setJwtPrincipalClaims: (
    claims: AuthenticationConfiguration['jwtPrincipalClaims']
  ) => void;
  setHelperFunctionsRef: (helperFunctions: HelperFunctions) => void;
  updateUserProfilePics: (data: { id: string; user: User }) => void;
  updateCachedEntityData: (data: {
    id: string;
    entityDetails: EntityUnion;
  }) => void;

  getRefreshToken: () => string;
  setRefreshToken: (refreshToken: string) => void;
  getOidcToken: () => string;
  setOidcToken: (oidcToken: string) => void;
  removeOidcToken: () => void;
  removeRefreshToken: () => void;
  updateSearchCriteria: (criteria: ExploreSearchIndex | '') => void;
}

export interface DomainStore {
  domains: Domain[];
  domainLoading: boolean;
  activeDomain: string;
  domainOptions: ItemType[];
  fetchDomainList: () => Promise<void>;
  updateDomains: (domainsArr: Domain[]) => void;
  refreshDomains: () => Promise<void>;
  updateActiveDomain: (activeDomainKey: string) => void;
}
