/**
 * 金币技能：万箭齐发
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteWanJianQiFa(gameStore) {
  return function executeWanJianQiFa(caster, target, targetCity) {
    if (!targetCity) {
      return { success: false, message: '未选择目标城市' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '万箭齐发')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '万箭齐发',
        `${caster.name}使用万箭齐发，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了万箭齐发`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('万箭齐发', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, targetCity.name)) {
      addSkillUsageLog(gameStore, caster.name, '万箭齐发',
        `${caster.name}使用了万箭齐发，但目标是副中心城市，技能无效`,
        `${caster.name}使用了万箭齐发`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // ✅ 修复：计算每个城市HP×50%之和，而非总HP×50%
    // PDF规则："己方所有城市同时攻击，造成各自HP一半伤害"
    // 每个城市先计算floor(HP×0.5)，然后求和
    const totalDamage = Object.values(caster.cities)
      .filter(c => c.isAlive !== false)
      .reduce((sum, c) => sum + Math.floor((c.currentHp || c.hp) * TUNE.wanJianQiFa.hpDamageRatio), 0)

    // 获取城市名称
    const cityName = targetCity.name

    // 检查并消耗保护罩/钢铁护盾
    if (gameStore.consumeProtection(target.name, cityName)) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '万箭齐发',
        `${caster.name}的万箭齐发击破了${target.name}的城市护盾`,
        `${caster.name}的万箭齐发击破了${target.name}的${targetCity.name}护盾`
      )
      return {
        success: true,
        message: `击破了${targetCity.name}的护盾`
      }
    }

    // 造成伤害
    const currentHp = targetCity.currentHp || targetCity.hp
    targetCity.currentHp = Math.max(0, currentHp - totalDamage)

    // 检查是否阵亡
    if (targetCity.currentHp <= 0) {
      targetCity.isAlive = false

      // 添加到deadCities列表
      if (!gameStore.deadCities[target.name]) {
        gameStore.deadCities[target.name] = []
      }
      if (cityName && !gameStore.deadCities[target.name].includes(cityName)) {
        gameStore.deadCities[target.name].push(cityName)
      }

      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '万箭齐发',
        `${caster.name}对${target.name}的城市使用万箭齐发，造成${totalDamage}伤害并摧毁`,
        `${caster.name}对${target.name}的${targetCity.name}使用万箭齐发，造成${totalDamage}伤害并摧毁`
      )
    } else {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '万箭齐发',
        `${caster.name}对${target.name}的城市使用万箭齐发，造成${totalDamage}伤害`,
        `${caster.name}对${target.name}的${targetCity.name}使用万箭齐发，造成${totalDamage}伤害`
      )
    }

    return {
      success: true,
      message: `造成${totalDamage}点伤害`
    }
  }
}
