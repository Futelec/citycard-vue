#!/usr/bin/env python3
"""
Project: CityCard
File: fix_battle_public_final.py
Description:
批量修正 battleSkills.js 中的公开日志
在公开日志开头添加 ${caster.name}使用了XXX，

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
with open(filepath + '.before_final_fix', 'w', encoding='utf-8') as f:
    f.write(content)

# 查找所有 addSkillUsageLog 调用，修改公开日志
def replace_public_log(match):
    indent = match.group(1)
    skill_name = match.group(2)
    public_msg = match.group(3)
    private_msg = match.group(4)

    # 如果公开日志已经包含 ${caster.name}，跳过
    if '${caster.name}' in public_msg:
        return match.group(0)

    # 在公开日志开头添加 ${caster.name}使用了XXX，
    new_public_msg = f'${{caster.name}}使用了{skill_name}，{public_msg}'

    # 重新构建调用
    result = f'''{indent}addSkillUsageLog(
{indent}  gameStore,
{indent}  caster.name,
{indent}  '{skill_name}',
{indent}  `{new_public_msg}`,
{indent}  {private_msg}
{indent})'''

    return result

# 匹配 addSkillUsageLog 调用（单引号公开日志）
pattern = r"([ ]*)addSkillUsageLog\(\s*gameStore,\s*caster\.name,\s*'([^']+)',\s*'([^']+)',\s*(`[^`]+`|'[^']+')\s*\)"

content = re.sub(pattern, replace_public_log, content, flags=re.MULTILINE)

# 匹配 addSkillUsageLog 调用（反引号公开日志）
pattern2 = r"([ ]*)addSkillUsageLog\(\s*gameStore,\s*caster\.name,\s*'([^']+)',\s*`([^`]+)`,\s*(`[^`]+`|'[^']+')\s*\)"

content = re.sub(pattern2, replace_public_log, content, flags=re.MULTILINE)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 已修正 battleSkills.js 中的公开日志格式")
print("   在所有公开日志开头添加了 ${caster.name}使用了XXX")
