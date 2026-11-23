/**
 * 金币技能：清除加成
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteQingChuJiaCheng(gameStore) {
  return function executeQingChuJiaCheng(caster, target, targetCity) {
    if (!targetCity) {
      return { success: false, message: '未选择目标城市' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '清除加成')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '清除加成',
        `${caster.name}使用清除加成，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了清除加成`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('清除加成', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 获取城市名称
    const cityName = targetCity.name

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, cityName)) {
      addSkillUsageLog(gameStore, caster.name, '清除加成',
        `${caster.name}使用了清除加成，但目标是副中心城市，技能无效`,
        `${caster.name}使用了清除加成`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // 检查钢铁城市
    const hasIron = gameStore.hasIronShield(target.name, cityName)
    if (hasIron) {
      const ironLevel = gameStore.ironCities[target.name][cityName]
      if (ironLevel > 1) {
        // 第一次清除：只减少钢铁层数，不做其他任何事
        gameStore.ironCities[target.name][cityName]--
        addSkillUsageLog(gameStore, caster.name, '清除加成',
          `${caster.name}对${target.name}的${cityName}使用清除加成，钢铁护盾减一层`,
          `${caster.name}使用了清除加成`)
        return { success: true, message: '钢铁城市护盾减少一层' }
      } else {
        // 第二次清除：移除钢铁护盾，然后继续执行完整清除
        delete gameStore.ironCities[target.name][cityName]
        addSkillEffectLog(gameStore, `${target.name}的${cityName}钢铁护盾被完全清除`)
        // 继续往下执行完整清除逻辑
      }
    }

    // 消耗城市保护（非钢铁）
    if (!hasIron && gameStore.hasProtection(target.name, cityName)) {
      gameStore.consumeProtection(target.name, cityName)
      addSkillEffectLog(gameStore, `清除加成效果被${target.name}的城市护盾抵消`)
      return {
        success: true,
        message: `效果被护盾抵消`
      }
    }

    // 清除所有modifier
    targetCity.modifiers = []

    // 清除HP超过上限的部分（恢复到初始HP）
    const currentHp = targetCity.currentHp || targetCity.hp
    if (currentHp > targetCity.hp) {
      targetCity.currentHp = targetCity.hp
    }

    addSkillEffectLog(gameStore, `清除了${target.name}的城市的所有加成`)

    return {
      success: true,
      message: `清除了${targetCity.name}的所有加成效果`
    }
  }
}
