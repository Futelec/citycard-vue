/**
 * 金币技能：定海神针
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteDingHaiShenZhen(gameStore) {
  return function executeDingHaiShenZhen(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    // 验证城市存在
    const cityName = selfCity.name
    if (!caster.cities[cityName]) {
      return { success: false, message: '城市不在玩家城市列表中' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('定海神针', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 在gameStore中设置定海神针
    if (!gameStore.anchored[caster.name]) {
      gameStore.anchored[caster.name] = {}
    }
    gameStore.anchored[caster.name][cityName] = TUNE.dingHaiShenZhen.rounds

    // 双日志：公开只显示使用了技能，详情为私密
    addSkillUsageLog(
      gameStore,
      caster.name,
      '定海神针',
      `${caster.name}使用了定海神针`,
      `你对${selfCity.name}使用了定海神针，10回合内不会被交换`
    )

    return {
      success: true,
      message: `${caster.name}使用了定海神针，该城市10回合内不会被交换`,
      hidePublicLog: true
    }
  }
}
