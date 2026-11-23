/**
 * 金币技能：步步高升
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteBuBuGaoSheng(gameStore) {
  return function executeBuBuGaoSheng(caster, selfCity) {
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

    const mode = gameStore.gameMode || '2P'
    const is2pOr2v2 = (mode === '2P' || mode === '2v2')

    // 检查是否为中心城市
    if (is2pOr2v2 && cityName === caster.centerCityName) {
      return { success: false, message: '不能对中心城市使用步步高升' }
    }

    // 获取城市省份（考虑拔旗易帜）
    let prov
    if (gameStore.changeFlagMark &&
        gameStore.changeFlagMark[caster.name] &&
        gameStore.changeFlagMark[caster.name][cityName]) {
      prov = gameStore.changeFlagMark[caster.name][cityName].newProvince
    } else {
      prov = selfCity.province || PROVINCE_MAP[selfCity.name]?.name
    }

    // 检查是否为直辖市/特别行政区
    if (prov === '直辖市和特区' ||
        prov === '北京市' || prov === '上海市' || prov === '天津市' || prov === '重庆市' ||
        prov === '香港特别行政区' || prov === '澳门特别行政区') {
      return {
        success: false,
        message: '不能对直辖市和特别行政区的城市使用步步高升'
      }
    }

    // 检查是否已有步步高升状态
    if (gameStore.bbgs &&
        gameStore.bbgs[caster.name] &&
        gameStore.bbgs[caster.name][cityName]) {
      return {
        success: false,
        message: '该城市已有步步高升状态'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('步步高升', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 获取城市的原始HP（从城市池中查找）
    const originalCityData = gameStore.getCityByName(selfCity.name)
    const originalHp = originalCityData ? originalCityData.hp : (selfCity.baseHp || selfCity.hp)

    // 初始化bbgs结构
    if (!gameStore.bbgs) {
      gameStore.bbgs = {}
    }
    if (!gameStore.bbgs[caster.name]) {
      gameStore.bbgs[caster.name] = {}
    }

    // 设置步步高升状态
    gameStore.bbgs[caster.name][cityName] = {
      count: 0,
      maxCount: TUNE.buBuGaoSheng.maxCount,
      originalHp: originalHp
    }

    // 加入谨慎交换集合
    if (!gameStore.cautiousSet) {
      gameStore.cautiousSet = {}
    }
    if (!gameStore.cautiousSet[caster.name]) {
      gameStore.cautiousSet[caster.name] = []
    }
    if (!gameStore.cautiousSet[caster.name].includes(cityName)) {
      gameStore.cautiousSet[caster.name].push(cityName)
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '了步步高升',
      `${caster.name}对${selfCity.name}使用了步步高升，该城市免疫特定技能，阵亡后可召唤同省更高HP城市（最多3次）`,
      `${caster.name}使用了了步步高升`
    )

    return {
      success: true,
      message: `${selfCity.name}获得步步高升状态，免疫四面楚歌、趁其不备等技能，阵亡后可复活3次`,
      data: {
        cityName: selfCity.name,
        province: prov,
        originalHp: originalHp
      }
    }
  }
}
