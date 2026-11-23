/**
 * 金币技能：铜墙铁壁
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'

export function createExecuteTongQiangTieBi(gameStore) {
  return function executeTongQiangTieBi(caster, target) {
    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '铜墙铁壁')) {
      // 双日志：被阻挡情况
      addSkillUsageLog(
        gameStore,
        caster.name,
        '铜墙铁壁',
        `${caster.name}使用了铜墙铁壁，铜墙铁壁被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了铜墙铁壁，但被${target.name}的坚不可摧护盾阻挡`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('铜墙铁壁', caster, gameStore)
    if (!goldCheck.success) return goldCheck

    // ✅ 修复：应该给caster免疫，而不是target
    if (!caster.battleModifiers) caster.battleModifiers = []

    caster.battleModifiers.push({
      type: 'damage_immunity',
      duration: TUNE.tongQiangTieBi.duration,
      source: caster.name
    })

    // 双日志：成功情况
    addSkillUsageLog(
      gameStore,
      caster.name,
      '铜墙铁壁',
      `${caster.name}使用了铜墙铁壁，铜墙铁壁生效，本轮完全免疫${target.name}的伤害`,
      `${caster.name}使用了铜墙铁壁`
    )

    return {
      success: true,
      message: `本轮对 ${target.name} 的伤害完全无效`
    }
  }
}
