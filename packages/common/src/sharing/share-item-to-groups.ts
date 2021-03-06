/** @license
 * Copyright 2020 Esri
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { UserSession } from "../";
import { shareItemWithGroup } from "@esri/arcgis-rest-portal";

/**
 * Share an item to one or more groups
 * Returns a promise for all the sharing calls
 * @param groups Array of Group Ids
 * @param itemId Item Id
 * @param authentication UserSession
 */
export function shareItemToGroups(
  groupIds: string[],
  itemId: string,
  authentication: UserSession
): Promise<any> {
  return Promise.all(
    groupIds.map(groupId => {
      return shareItemWithGroup({
        id: itemId,
        groupId,
        authentication
      });
    })
  );
}
