/**
 * 金币技能：搬运救兵
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteBanyunJiubingPutong(gameStore) {
  return function executeBanyunJiubingPutong(caster, selfCity) {
    if (!selfCity) {
      return { success: false, message: '未选择城市' }
    }

    const myCityName = selfCity.name
    if (!caster.cities[myCityName]) {
      return { success: false, message: '城市不在玩家城市列表中' }
    }

    // 获取有效省份（考虑拔旗易帜changeFlagMark）
    let provinceName
    if (gameStore.changeFlagMark &&
        gameStore.changeFlagMark[caster.name] &&
        gameStore.changeFlagMark[caster.name][myCityName]) {
      provinceName = gameStore.changeFlagMark[caster.name][myCityName].newProvince
    } else {
      const province = gameStore.getProvinceOfCity(selfCity.name)
      provinceName = province ? province.name : null
    }

    if (!provinceName || provinceName === '直辖市和特区') {
      return {
        success: false,
        message: '无法对直辖市和特别行政区的城市使用此技能！'
      }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('搬运救兵', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
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

    if (availableCities.length < TUNE.banyunJiubingPutong.count) {
      return {
        success: false,
        message: `${provinceName}中可用的未使用城市不足2个（当前${availableCities.length}个）`
      }
    }

    // 随机抽取2个
    const shuffled = [...availableCities].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, TUNE.banyunJiubingPutong.count)

    const newCityIndices = []
    const addedCities = []

    for (const cityData of picked) {
      // 创建城市副本
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

      // 添加到玩家城市列表
      caster.cities[newCity.name] = newCity
      const newCityKey = newCity.name
      newCityIndices.push(newCityKey)
      addedCities.push(newCity)

      // 标记为已使用
      gameStore.markCityAsUsed(cityData.name)

      // 记录到initialCities（Object格式，以城市名为key）
      if (!gameStore.initialCities[caster.name]) {
        gameStore.initialCities[caster.name] = {}
      }
      gameStore.initialCities[caster.name][newCity.name] = {
        name: newCity.name,
        hp: newCity.hp,
        currentHp: newCity.hp,
        baseHp: newCity.hp,
        isAlive: true
      }
    }

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '搬运救兵',
      `${caster.name}使用搬运救兵`,
      `你使用搬运救兵，从${provinceName}招募了${addedCities.map(c => `${c.name}(${c.hp})`).join('、')}`
    )

    return {
      success: true,
      message: `招募了2个${provinceName}城市：${addedCities.map(c => c.name).join('、')}`,
      data: {
        province: provinceName,
        addedCities: addedCities.map(c => ({ name: c.name, hp: c.hp }))
      }
    }
  }
}
