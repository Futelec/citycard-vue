/**
 * 金币技能：定时爆破
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteDingShiBaoPo(gameStore) {
  return function executeDingShiBaoPo(caster, target, targetCity) {
    if (!targetCity) {
      return { success: false, message: '未选择目标城市' }
    }

    if (targetCity.isCenter) {
      return { success: false, message: '无法对中心城市使用' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '定时爆破')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '定时爆破',
        `${caster.name}使用定时爆破，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了定时爆破`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('定时爆破', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 获取城市名称
    const cityName = targetCity.name

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, cityName)) {
      addSkillUsageLog(gameStore, caster.name, '定时爆破',
        `${caster.name}使用了定时爆破，但目标是副中心城市，技能无效`,
        `${caster.name}使用了定时爆破`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // 检查并消耗保护罩/钢铁护盾
    if (gameStore.consumeProtection(target.name, cityName)) {
      addSkillEffectLog(gameStore, `定时爆破被${target.name}的城市护盾抵消`)
      return {
        success: true,
        message: `效果被护盾抵消`
      }
    }

    // 在gameStore中设置定时炸弹
    if (!gameStore.timeBombs[target.name]) {
      gameStore.timeBombs[target.name] = {}
    }
    gameStore.timeBombs[target.name][cityName] = {
      countdown: TUNE.dingShiBaoPo.countdown,
      damage: TUNE.dingShiBaoPo.damage,
      centerDamage: TUNE.dingShiBaoPo.centerDamage
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '定时爆破',
      `${caster.name}对${target.name}的城市放置了定时炸弹`,
      `${caster.name}对${target.name}的${targetCity.name}放置了定时炸弹`
    )

    return {
      success: true,
      message: `${targetCity.name}上的炸弹将在3回合后爆炸`
    }
  }
}
