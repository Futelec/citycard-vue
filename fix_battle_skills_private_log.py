#!/usr/bin/env python3
"""
Project: CityCard
File: fix_battle_skills_private_log.py
Description:
修正 battleSkills.js 中的双日志格式
1. 私密日志：'你使用了' -> '${caster.name}使用了'
2. 私密日志：`你使用了` -> `${caster.name}使用了`
3. 私密日志：'你对' -> '${caster.name}对'
4. 私密日志：`你对` -> `${caster.name}对`

Copyright (C) 2026 Futelec. All rights reserved for game assets.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

[SPECIAL NOTICE] The GPLv3 license applies ONLY to the source code of
this file. All game assets (artwork, UI designs, sound, music, and lore)
are EXCLUDED from GPLv3 and are strictly proprietary (All Rights Reserved).

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
"""

import re

filepath = 'src/composables/skills/battleSkills.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 备份
with open(filepath + '.before_fix2', 'w', encoding='utf-8') as f:
    f.write(content)

# 替换 '你使用了' -> '${caster.name}使用了'
content = re.sub(r"'你使用了", r"'${caster.name}使用了", content)

# 替换 `你使用了` -> `${caster.name}使用了`
content = re.sub(r"`你使用了", r"`${caster.name}使用了", content)

# 替换 '你对' -> '${caster.name}对'
content = re.sub(r"'你对 ", r"'${caster.name}对 ", content)

# 替换 `你对` -> `${caster.name}对`
content = re.sub(r"`你对 ", r"`${caster.name}对 ", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 已修正 battleSkills.js 中的私密日志格式")
print("   - '你使用了' -> '${caster.name}使用了'")
print("   - '你对' -> '${caster.name}对'")
print("\n⚠️  注意：公开日志中缺少 ${caster.name} 仍需手动修正")
