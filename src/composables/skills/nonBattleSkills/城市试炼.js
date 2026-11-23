/**
 * 金币技能：城市试炼
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteChengShiShiLian(gameStore) {
  return function executeChengShiShiLian(caster, selfCity) {
    const targetCityName = selfCity.name
    if (!caster.cities[targetCityName]) {
      return { success: false, message: '城市不存在' }
    }

    if (selfCity.currentHp <= 0 || selfCity.isAlive === false) {
      return { success: false, message: '该城市已阵亡，无法使用城市试炼！' }
    }

    // 检查不能对中心城市使用
    const centerName = caster.centerCityName
    if (targetCityName === centerName) {
      return { success: false, message: '无法对中心城市使用城市试炼！' }
    }

    // 检查HP是否≤15000
    const currentHp = selfCity.currentHp || selfCity.hp
    if (currentHp > TUNE.chengShiShiLian.maxHp) {
      return {
        success: false,
        message: `城市试炼仅限当前血量≤15000的城市使用。${selfCity.name}当前为${Math.floor(currentHp)}`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('城市试炼', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 初始化试炼场结构
    if (!gameStore.cityTrialField) {
      gameStore.cityTrialField = {}
    }
    if (!gameStore.cityTrialField[caster.name]) {
      gameStore.cityTrialField[caster.name] = {}
    }

    // 记录试炼信息
    gameStore.cityTrialField[caster.name][targetCityName] = {
      originalHp: currentHp,
      roundsLeft: TUNE.chengShiShiLian.rounds,
      startRound: gameStore.currentRound,
      selfDestructOnDeploy: true  // 若强制出战则自毁
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '了城市试炼',
      `${caster.name}对${selfCity.name}使用了城市试炼，该城市进入试炼3回合，出来后HP×3（若强制出战则自毁）`,
      `${caster.name}使用了了城市试炼`
    )

    return {
      success: true,
      message: `${selfCity.name}进入试炼，3回合后HP×3（若强制出战则自毁）`
    }
  }
}
