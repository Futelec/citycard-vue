/**
 * 金币技能：避而不见
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteBiErBuJian(gameStore) {
  return function executeBiErBuJian(caster, target, targetCity) {
    if (!target || !targetCity) {
      return { success: false, message: '未选择目标' }
    }

    // 检查对方存活城市数
    const oppAliveCities = Object.values(target.cities).filter(c => c && (c.currentHp || c.hp) > 0)
    if (oppAliveCities.length < TUNE.biErBuJian.lowCityThreshold) {
      return {
        success: false,
        message: `对方存活城市数不足2个（当前${oppAliveCities.length}个），无法使用避而不见！`
      }
    }

    const targetCityName = targetCity.name
    if (!target.cities[targetCityName]) {
      return { success: false, message: '城市不存在' }
    }

    // 检查城市是否已知
    if (!gameStore.knownCities || !gameStore.knownCities[caster.name] ||
        !gameStore.knownCities[caster.name][target.name] ||
        !gameStore.knownCities[caster.name][target.name].includes(targetCityName)) {
      return { success: false, message: '该城市尚未已知，无法使用避而不见' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '避而不见')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '避而不见',
        `${caster.name}使用避而不见，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了避而不见`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('避而不见', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, targetCityName)) {
      addSkillUsageLog(gameStore, caster.name, '避而不见',
        `${caster.name}使用了避而不见，但目标是副中心城市，技能无效`,
        `${caster.name}使用了避而不见`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // 根据对方城市数决定持续回合数
    const duration = oppAliveCities.length === TUNE.biErBuJian.lowCityThreshold ? TUNE.biErBuJian.lowRounds : TUNE.biErBuJian.rounds

    // 初始化结构
    if (!gameStore.forcedBench) {
      gameStore.forcedBench = {}
    }
    if (!gameStore.forcedBench[target.name]) {
      gameStore.forcedBench[target.name] = {}
    }

    // 设置避而不见效果
    gameStore.forcedBench[target.name][targetCityName] = duration

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '避而不见',
      `${caster.name}对${target.name}的城市使用了避而不见，该城市${duration}回合无法出战`,
      `${caster.name}对${target.name}的${targetCity.name}使用了避而不见，${duration}回合无法出战`
    )

    return {
      success: true,
      message: `${targetCity.name}将${duration}回合无法出战`
    }
  }
}
