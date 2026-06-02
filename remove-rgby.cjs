#!/usr/bin/env node
/**
 * Project: CityCard
 * File: remove-rgby.cjs
 * Description: Script to remove red, green, blue, yellow properties from cities.js
 *
 * Copyright (C) 2026 Futelec. All rights reserved for game assets.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * [SPECIAL NOTICE] The GPLv3 license applies ONLY to the source code of
 * this file. All game assets (artwork, UI designs, sound, music, and lore)
 * are EXCLUDED from GPLv3 and are strictly proprietary (All Rights Reserved).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/data/cities.js');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Remove red, green, blue, yellow properties using regex
// Matches patterns like: red: 1, green: 0, blue: 3, yellow: 2
content = content.replace(/,?\s*(red|green|blue|yellow):\s*\d+/g, '');

// Clean up double commas and trailing commas before closing braces
content = content.replace(/,\s*,/g, ',');
content = content.replace(/,(\s*})/g, '$1');

// Write back the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Successfully removed RGBY properties from cities.js');
