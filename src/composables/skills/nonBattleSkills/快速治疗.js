/**
 * 金币技能：快速治疗
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteKuaiSuZhiLiao(gameStore) {
  return function executeKuaiSuZhiLiao(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    if (!selfCity.isAlive) {
      return { success: false, message: '城市已阵亡' }
    }

    // 获取城市在caster.cities中的键
    const cityName = selfCity.name
    if (!caster.cities[cityName]) {
      return { success: false, message: '未找到该城市' }
    }

    // maxHp为城市当前的基础HP（selfCity.hp），会随一落千丈等技能变化
    const maxHp = selfCity.hp

    const currentHp = selfCity.currentHp !== undefined ? selfCity.currentHp : selfCity.hp

    if (currentHp >= maxHp) {
      return { success: false, message: '城市已满血' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('快速治疗', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 增加15000HP，不超过初始HP
    const before = currentHp
    selfCity.currentHp = Math.min(currentHp + TUNE.kuaiSuZhiLiao.healAmount, maxHp)
    const healed = selfCity.currentHp - before

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '快速治疗',
      `${caster.name}使用了快速治疗`,
      `你对${selfCity.name}使用了快速治疗，HP+${healed}（${Math.floor(before)} → ${Math.floor(selfCity.currentHp)}）`
    )

    return {
      success: true,
      message: `${selfCity.name} HP+${healed}`
    }
  }
}
