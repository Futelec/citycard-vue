#!/usr/bin/env python3
"""
Project: CityCard
File: fix_dual_log_format.py
Description:
修正双日志格式：
1. 私密日志：${caster.name}使用了XXX（不是"你使用了"）
2. 公开日志：必须包含 ${caster.name}

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
import sys

def fix_battle_skills():
    """修正 battleSkills.js"""
    filepath = 'src/composables/skills/battleSkills.js'

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 备份
    with open(filepath + '.before_fix', 'w', encoding='utf-8') as f:
        f.write(content)

    # 模式1: 修正所有 '你使用了' -> '${caster.name}使用了'
    # 但要注意只替换私密日志中的，不要替换注释中的
    content = re.sub(
        r"'你使用了([^']+)'",
        r"'${caster.name}使用了\1'",
        content
    )

    # 模式2: 修正所有 `你使用了 -> `${caster.name}使用了
    content = re.sub(
        r"`你使用了([^`]+)`",
        r"`${caster.name}使用了\1`",
        content
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✅ 修正 {filepath}")

def fix_non_battle_skills():
    """修正 nonBattleSkills.js"""
    filepath = 'src/composables/skills/nonBattleSkills.js'

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 备份
    with open(filepath + '.before_fix', 'w', encoding='utf-8') as f:
        f.write(content)

    # 模式1: 修正所有 '你使用了' -> '${caster.name}使用了'
    content = re.sub(
        r"'你使用了([^']+)'",
        r"'${caster.name}使用了\1'",
        content
    )

    # 模式2: 修正所有 `你使用了 -> `${caster.name}使用了
    content = re.sub(
        r"`你使用了([^`]+)`",
        r"`${caster.name}使用了\1`",
        content
    )

    # 模式3: 修正 '你转账 -> '${caster.name}转账
    content = re.sub(
        r"'你转账([^']+)'",
        r"'${caster.name}转账\1'",
        content
    )

    # 模式4: 修正 `你转账 -> `${caster.name}转账
    content = re.sub(
        r"`你转账([^`]+)`",
        r"`${caster.name}转账\1`",
        content
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✅ 修正 {filepath}")

if __name__ == '__main__':
    print("修正双日志格式...")
    print("\n1. 修正 battleSkills.js")
    fix_battle_skills()

    print("\n2. 修正 nonBattleSkills.js")
    fix_non_battle_skills()

    print("\n✅ 完成！")
    print("\n注意：这个脚本只修正了私密日志中的'你'")
    print("公开日志中移除的 ${caster.name} 需要手动恢复")
