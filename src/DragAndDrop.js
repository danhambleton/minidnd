/*************************************************************************
 * 
 * MESH CONSULTANTS INC.
 * __________________
 * 
 *  2019 MESH Consultants Inc. 
 *  All Rights Reserved.
 * 
 * This source code is licensed under Mesh Consultants Inc. End User 
 * License Agreement (the “License”);
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the license at:
 * https://www.dropbox.com/s/08nx0abig5rmee7/END%20USER%20LICENSE%20AGREEMENT%20-%20December%209%2C%202019.pdf?dl=0
 * 
 * Unless required by applicable law or agreed to in writing, the source code
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of MESH Consultants Inc. and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Mesh Consultants Inc.,
 * and its suppliers and is covered and protected by copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless express prior written permission is obtained
 * from MESH Consultants Inc.
 */

// Functions to help set up drag & drop file uploads

export function setupDragAndDrop(dropArea, callback) {
  function preventDefaultDragAndDrop(event) {
    event.preventDefault();
    event.stopPropagation();
  }
  ["dragenter", "dragover", "dragleave", "drop"].forEach(eventType => {
    dropArea.addEventListener(eventType, preventDefaultDragAndDrop, false);
    document.body.addEventListener(eventType, preventDefaultDragAndDrop, false);
  });

  function handleDrop(event) {
    let dataTransfer = event.dataTransfer;
    let files = dataTransfer.files;

    // Should only be 1 file
    //files[0].text().then(text => loadOBJToLineSegmentsFromText(text, callback));

    console.log("hello file");
  }
  dropArea.addEventListener("drop", handleDrop, false);
}
