/**
 * 金币技能：强制搬运
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteQiangZhiBanYun(gameStore) {
  return function executeQiangZhiBanYun(caster, target, targetCity) {
    if (!target) {
      return { success: false, message: '未选择对手' }
    }

    if (!targetCity) {
      return { success: false, message: '未选择目标城市' }
    }

    const targetCityName = targetCity.name
    if (!target.cities[targetCityName]) {
      return { success: false, message: '目标城市不存在' }
    }

    if (targetCity.currentHp <= 0 || targetCity.isAlive === false) {
      return { success: false, message: '目标城市已阵亡' }
    }

    // 检查城市是否已知
    if (!gameStore.knownCities || !gameStore.knownCities[caster.name] ||
        !gameStore.knownCities[caster.name][target.name] ||
        !gameStore.knownCities[caster.name][target.name].includes(targetCityName)) {
      return { success: false, message: '该城市尚未已知，无法使用强制搬运' }
    }

    // 获取有效省份（考虑拔旗易帜）
    let provinceName
    if (gameStore.changeFlagMark &&
        gameStore.changeFlagMark[target.name] &&
        gameStore.changeFlagMark[target.name][targetCityName]) {
      provinceName = gameStore.changeFlagMark[target.name][targetCityName].newProvince
    } else {
      provinceName = targetCity.province || PROVINCE_MAP[targetCity.name]?.name
    }

    if (!provinceName) {
      return { success: false, message: `未找到${targetCity.name}所属省份` }
    }

    if (provinceName === '直辖市和特区' || provinceName === '北京市' || provinceName === '上海市' ||
        provinceName === '天津市' || provinceName === '重庆市' || provinceName === '香港特别行政区' ||
        provinceName === '澳门特别行政区') {
      return {
        success: false,
        message: '不能对直辖市和特区的城市使用强制搬运'
      }
    }

    // 检查坚不可摧护盾
    if (gameStore.isBlockedByJianbukecui(target.name, caster.name, '强制搬运')) {
      // 双日志
      addSkillUsageLog(
        gameStore,
        caster.name,
        '强制搬运',
        `${caster.name}使用强制搬运，但被${target.name}的坚不可摧护盾阻挡`,
        `${caster.name}使用了强制搬运`
      )
      return {
        success: false,
        message: `被${target.name}的坚不可摧护盾阻挡`
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('强制搬运', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 副中心制保护：对手所有针对副中心城市的技能无效，金币不返还
    if (gameStore.isSubCenter(target.name, targetCityName)) {
      addSkillUsageLog(gameStore, caster.name, '强制搬运',
        `${caster.name}使用了强制搬运，但目标是副中心城市，技能无效`,
        `${caster.name}使用了强制搬运`)
      return { success: true, message: '目标是副中心城市，技能无效，金币不返还' }
    }

    // 获取所有已使用的城市名
    const usedNames = new Set()
    gameStore.players.forEach(player => {
      Object.values(player.cities).forEach(city => {
        if (city && city.name) {
          usedNames.add(city.name)
        }
      })
    })

    // 从未使用城市池中筛选同省且可用的城市
    const unusedCities = gameStore.getUnusedCities()
    const availableCities = unusedCities.filter(c => {
      const cityProvince = gameStore.getProvinceOfCity(c.name)
      return cityProvince && cityProvince.name === provinceName && !usedNames.has(c.name)
    })

    if (availableCities.length < TUNE.qiangZhiBanYun.minAvailableCities) {
      return {
        success: false,
        message: `${provinceName}可用城市不足（需要2个，剩余${availableCities.length}个）`
      }
    }

    // 随机抽取2个城市
    const shuffled = [...availableCities].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, TUNE.qiangZhiBanYun.recruitCount)

    // 添加城市到对手
    const newCityIndices = []
    const pickedNames = []

    picked.forEach(cityData => {
      const newCity = {
        name: cityData.name,
        hp: cityData.hp,
        currentHp: cityData.hp,
        baseHp: cityData.hp,
        isAlive: true,
        red: cityData.red || 0,
        green: cityData.green || 0,
        blue: cityData.blue || 0,
        yellow: cityData.yellow || 0,
        modifiers: []
      }

      target.cities[newCity.name] = newCity
      newCityIndices.push(newCity.name)
      pickedNames.push(newCity.name)

      // 标记为已使用
      gameStore.markCityAsUsed(cityData.name)
    })

    // 记录到initialCities
    if (!gameStore.initialCities[target.name]) {
      gameStore.initialCities[target.name] = {}
    }
    picked.forEach(cityData => {
      gameStore.initialCities[target.name][cityData.name] = {
        name: cityData.name,
        hp: cityData.hp,
        currentHp: cityData.hp,
        baseHp: cityData.hp,
        isAlive: true
      }
    })

    // 设置强制出战标记
    if (!gameStore.playerStates[target.name]) {
      gameStore.playerStates[target.name] = {}
    }
    gameStore.playerStates[target.name].forcedDeployment = {
      cities: [targetCityName, ...newCityIndices], // 原城市 + 2个新城市
      reason: '强制搬运'
    }

    // 禁用对方部分技能3回合
    if (!gameStore.forcedSoldierBan) {
      gameStore.forcedSoldierBan = {}
    }
    gameStore.forcedSoldierBan[target.name] = {
      roundsLeft: TUNE.qiangZhiBanYun.banRounds,
      bannedSkills: ['搬运救兵']
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '强制搬运',
      `${caster.name}对${target.name}使用了强制搬运`,
      `你对${target.name}使用了强制搬运，为其招募了${pickedNames.join('、')}，强制下回合出战${targetCity.name}和新城市`
    )

    return {
      success: true,
      message: `成功为${target.name}招募2个${provinceName}城市：${pickedNames.join('、')}，并强制下回合出战`,
      data: {
        province: provinceName,
        originalCity: targetCity.name,
        newCities: pickedNames
      }
    }
  }
}
