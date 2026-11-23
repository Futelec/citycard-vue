/**
 * 金币技能：数位反转
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteShuWeiFanZhuan(gameStore) {
  return function executeShuWeiFanZhuan(caster, targetPlayer, targetCity) {
    if (!targetPlayer || !targetCity) {
      return { success: false, message: '未选择目标' }
    }

    const targetCityName = targetCity.name
    if (!targetPlayer.cities[targetCityName]) {
      return { success: false, message: '城市不存在' }
    }

    const currentHp = targetCity.currentHp || targetCity.hp

    // 检查HP是否为80000或100000
    if (currentHp === TUNE.shuWeiFanZhuan.forbiddenHp1 || currentHp === TUNE.shuWeiFanZhuan.forbiddenHp2) {
      return { success: false, message: '无法对HP为80000或100000的城市使用数位反转' }
    }

    // 确定金币花费：对对手4金币，对己方10金币
    const isOpponent = targetPlayer.name !== caster.name
    const skillCost = isOpponent ? TUNE.shuWeiFanZhuan.opponentCost : TUNE.shuWeiFanZhuan.selfCost

    // 如果目标是对手城市
    if (isOpponent) {
      // 检查是否为中心城市
      if (targetCity.isCenter) {
        return { success: false, message: '无法对对手中心城市使用数位反转' }
      }

      // 检查是否已知
      if (!gameStore.knownCities || !gameStore.knownCities[caster.name] ||
          !gameStore.knownCities[caster.name][targetPlayer.name] ||
          !gameStore.knownCities[caster.name][targetPlayer.name].includes(targetCityName)) {
        return { success: false, message: '该城市尚未已知，无法使用数位反转' }
      }

      // 检查坚不可摧护盾
      if (gameStore.isBlockedByJianbukecui(targetPlayer.name, caster.name, '数位反转')) {
        // 双日志
        addSkillUsageLog(
          gameStore,
          caster.name,
          '数位反转',
          `${caster.name}使用数位反转，但被${targetPlayer.name}的坚不可摧护盾阻挡`,
          `${caster.name}使用了数位反转`
        )
        return {
          success: false,
          message: `被${targetPlayer.name}的坚不可摧护盾阻挡`
        }
      }
    }

    // 金币检查和扣除（动态费用：对对手7金币，对己方10金币）
    if (caster.gold < skillCost) {
      return {
        success: false,
        message: `${caster.name} 金币不足（需要${skillCost}，当前${caster.gold}）`
      }
    }
    caster.gold -= skillCost

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (isOpponent && gameStore.isSubCenter(targetPlayer.name, targetCityName)) {
      addSkillUsageLog(gameStore, caster.name, '数位反转',
        `${caster.name}使用了数位反转，但目标是副中心城市，技能无效`,
        `${caster.name}使用了数位反转`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // 反转HP数字（如果末位是0，反转后舍去 - parseInt自动处理前导0）
    const hpString = Math.floor(currentHp).toString()
    const reversedString = hpString.split('').reverse().join('')
    // parseInt会自动去掉前导0，例如：12340 → "04321" → 4321
    let newHp = parseInt(reversedString, 10)

    // 上限80000
    if (newHp > TUNE.shuWeiFanZhuan.hpCap) {
      newHp = TUNE.shuWeiFanZhuan.hpCap
    }

    targetCity.currentHp = newHp

    // 双日志
    const costMsg = isOpponent ? '花费4金币' : '花费10金币'
    addSkillUsageLog(
      gameStore,
      caster.name,
      '数位反转',
      `${caster.name}对${targetPlayer.name}的城市使用了数位反转（${costMsg}）（每局限1次）`,
      `${caster.name}对${targetPlayer.name}的${targetCity.name}使用了数位反转，HP从${Math.floor(currentHp)}变为${newHp}`
    )

    return {
      success: true,
      message: `${targetCity.name}的HP已从${Math.floor(currentHp)}变为${newHp}（花费${skillCost}金币）`,
      data: {
        oldHp: currentHp,
        newHp: newHp
      }
    }
  }
}
