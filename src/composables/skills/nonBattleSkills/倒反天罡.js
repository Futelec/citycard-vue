/**
 * 金币技能：倒反天罡
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteDaoFanTianGang(gameStore) {
  return function executeDaoFanTianGang(caster, target, capitalCityName) {
    if (!target || capitalCityName === undefined) {
      return { success: false, message: '未选择目标省会城市' }
    }

    const capital = target.cities[capitalCityName]
    if (!capital || capital.currentHp <= 0 || capital.isAlive === false) {
      return { success: false, message: '目标城市已阵亡' }
    }

    // 检查是否是中心城市
    const mode = gameStore.gameMode || '2P'
    if ((mode === '2P' || mode === '2v2') && target.centerCityName === capitalCityName) {
      return { success: false, message: '无法对中心城市使用倒反天罡' }
    }

    // 检查是否是省会（需要省会判断逻辑）
    // 简化：假设城市有isCapitalCity属性或根据名称判断
    const isCapital = capital.isCapitalCity || isCapitalCity(capital.name)
    if (!isCapital) {
      return { success: false, message: '目标城市不是省会城市' }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '倒反天罡')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '倒反天罡',
        `${caster.name}使用倒反天罡，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了倒反天罡`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('倒反天罡', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, capitalCityName)) {
      addSkillUsageLog(gameStore, caster.name, '倒反天罡',
        `${caster.name}使用了倒反天罡，但目标是副中心城市，技能无效`,
        `${caster.name}使用了倒反天罡`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // 获取省份名称
    const province = gameStore.getProvinceOfCity(capital.name)?.name || '未知省份'

    // 设置倒反天罡状态
    if (!gameStore.reversedCapitals) {
      gameStore.reversedCapitals = {}
    }
    if (!gameStore.reversedCapitals[target.name]) {
      gameStore.reversedCapitals[target.name] = {}
    }

    gameStore.reversedCapitals[target.name][capitalCityName] = {
      province: province,
      cityName: capital.name
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '倒反天罡',
      `${caster.name}对${target.name}的省会${capital.name}（${province}）使用了倒反天罡，该省会失去归顺效果`,
      `${caster.name}使用了倒反天罡`
    )

    return {
      success: true,
      message: `${capital.name}（${province}）失去归顺效果，该省不再触发省会归顺`,
      data: {
        capitalCity: capital.name,
        province: province
      }
    }
  }
}
