/**
 * 金币技能：言听计从
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteYanTingJiCong(gameStore) {
  return function executeYanTingJiCong(caster, target, targetCityName) {
    if (!target || targetCityName === undefined) {
      return { success: false, message: '未选择目标城市' }
    }

    const targetCity = target.cities[targetCityName]
    if (!targetCity || targetCity.currentHp <= 0 || targetCity.isAlive === false) {
      return { success: false, message: '目标城市已阵亡' }
    }

    // 检查是否是中心城市
    const mode = gameStore.gameMode || '2P'
    if ((mode === '2P' || mode === '2v2') && target.centerCityName === targetCityName) {
      return { success: false, message: '无法指定对手中心城市' }
    }

    // 检查对手是否已经确认本回合的出战部署
    if (gameStore.deploymentConfirmed &&
        gameStore.deploymentConfirmed[target.name]) {
      return { success: false, message: '对手已经确认本回合出战，无法使用言听计从' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('言听计从', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, targetCityName)) {
      addSkillUsageLog(gameStore, caster.name, '言听计从',
        `${caster.name}使用了言听计从，但目标是副中心城市，技能无效`,
        `${caster.name}使用了言听计从`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // 标记城市
    if (!gameStore.yantingjicong) {
      gameStore.yantingjicong = {}
    }
    gameStore.yantingjicong[target.name] = {
      cityName: targetCityName,
      demandBy: caster.name,
      enforced: false
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '言听计从',
      `${caster.name}对${target.name}使用了言听计从，要求本回合出战指定城市，否则将被抢夺`,
      `${caster.name}对${target.name}使用了言听计从，要求出战${targetCity.name}，否则将被抢夺`
    )

    return {
      success: true,
      message: `${target.name}必须本回合出战${targetCity.name}，否则将被抢夺`
    }
  }
}
