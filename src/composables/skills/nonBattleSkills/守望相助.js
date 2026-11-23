/**
 * 金币技能：守望相助
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteShouWangXiangZhu(gameStore) {
  return function executeShouWangXiangZhu(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    const cityName = selfCity.name
    if (!caster.cities[cityName]) {
      return { success: false, message: '城市不在玩家城市列表中' }
    }

    if (selfCity.currentHp <= 0 || selfCity.isAlive === false) {
      return { success: false, message: '该城市已阵亡' }
    }

    // 获取有效省份（考虑拔旗易帜changeFlagMark）
    let prov = selfCity.province || PROVINCE_MAP[selfCity.name]?.name
    if (gameStore.changeFlagMark &&
        gameStore.changeFlagMark[caster.name] &&
        gameStore.changeFlagMark[caster.name][cityName]) {
      prov = gameStore.changeFlagMark[caster.name][cityName].newProvince
    }

    // 检查是否是直辖市/特别行政区
    if (prov === '北京市' || prov === '上海市' || prov === '天津市' || prov === '重庆市' ||
        prov === '香港特别行政区' || prov === '澳门特别行政区' || prov === '直辖市和特区') {
      return {
        success: false,
        message: '无法对直辖市和特别行政区的城市使用守望相助'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('守望相助', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 初始化mutualWatch玩家条目（mutualWatch已在gameStore中声明为reactive）
    if (!gameStore.mutualWatch[caster.name]) {
      gameStore.mutualWatch[caster.name] = {}
    }

    // 设置守望相助状态
    gameStore.mutualWatch[caster.name][cityName] = {
      province: prov,
      cityName: selfCity.name
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '守望相助',
      `${caster.name}使用了守望相助`,
      `${caster.name}对${selfCity.name}（${prov}）使用了守望相助，当该城市阵亡时将自动从未使用城市池召唤同省城市`
    )

    return {
      success: true,
      message: `${selfCity.name}获得守望相助效果，阵亡时将自动从未使用城市池召唤同省城市`,
      data: {
        cityName: selfCity.name,
        province: prov
      }
    }
  }
}
