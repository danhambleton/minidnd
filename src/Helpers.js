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

import * as THREE from 'three';

import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader';


export function makeTransform(pos, eulerRot, scale) {
	var matrix = new THREE.Matrix4();
	var quaternion = new THREE.Quaternion();
	quaternion.setFromEuler(eulerRot);
	matrix.compose(pos, quaternion, scale);
	return matrix;
}

// Loads an OBJ model consisting of line segments (l instead of f)
// If succesful, calls callback(LineSegments)
export function loadOBJToLineSegmentsFromPath(path, callback) {
	var loader = new OBJLoader();
	loader.load(
		path,
		function (object) {
			object.traverse( function ( child ) {
				if (child.isLineSegments) {
					callback(child);
				}
			});
		},
		function (xhr) {
			console.log((xhr.loaded / xhr.total * 100 ) + '% loaded');
		},
		function (error) {
			console.log('An error happened');
		}
	);
}


// Loads an OBJ file from text/string
export function loadOBJToLineSegmentsFromText(text, callback) {
	let loader = new OBJLoader();
	let object = loader.parse(text);
	
	object.traverse(child => {
		if (child.isLineSegments) callback(child);
	});
}


// loads a json file, parses it, then calls callback(jsonObject)
export function loadJSON(path, callback) {
	var loader = new THREE.FileLoader();
	loader.load(
		path,
		function (jsonString) {
			callback(JSON.parse(jsonString));
		},
		function (xhr) {
			console.log((xhr.loaded / xhr.total * 100 ) + '% loaded');
		},
		function (error) {
			console.log('An error happened');
		}
	);
}

export function getCentroid(mesh) {
  mesh.geometry.computeBoundingBox();
  var boundingBox = mesh.geometry.boundingBox;
  var x0 = boundingBox.min.x;
  var x1 = boundingBox.max.x;
  var y0 = boundingBox.min.y;
  var y1 = boundingBox.max.y;
  var z0 = boundingBox.min.z;
  var z1 = boundingBox.max.z;


  var bWidth = ( x0 > x1 ) ? x0 - x1 : x1 - x0;
  var bHeight = ( y0 > y1 ) ? y0 - y1 : y1 - y0;
  var bDepth = ( z0 > z1 ) ? z0 - z1 : z1 - z0;

  var centroidX = x0 + ( bWidth / 2 ) + mesh.position.x;
  var centroidY = y0 + ( bHeight / 2 )+ mesh.position.y;
  var centroidZ = z0 + ( bDepth / 2 ) + mesh.position.z;

  return mesh.geometry.centroid = { x : centroidX, y : centroidY, z : centroidZ };
}

export function centerCameraOnMesh(mesh, controls) {
  var center = getCentroid(mesh);
  controls.target.set(center.x, center.y, center.z);
  controls.update();
}

export function createEdgeBasis(delta)
{
	let up = (delta.x > 0.0) ? new THREE.Vector3(0.0, 0.0, 1.0) : new THREE.Vector3(1.0, 0.0, 0.0);
	let vx = new THREE.Vector3(delta.x, delta.y, delta.z).cross(up).normalize();
	let vy = new THREE.Vector3(delta.x, delta.y, delta.z).normalize();
	let vz = new THREE.Vector3(vx.x, vx.y, vx.z).cross(vy);

	var mat = new THREE.Matrix3();
	mat.set(vx.x, vx.y, vx.z,
			vy.x, vy.y, vy.z,
			vz.x, vz.y, vz.z);

	return mat;
}

export function saturate(x)
{
	return (x < 0) ? 0 : (x > 1.0) ? 1.0 : x;
}

export function lerp(x1, x2, t)
{
	return x1 + (x2 - x1) * t;
}

