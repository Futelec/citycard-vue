/**
 * 金币技能：众志成城
 * 独立技能文件：修改本技能只需修改本文件。
 */

import { checkAndDeductGold, SKILL_COSTS, HP_BANK_WITHDRAW_COST } from '../../../constants/skillCosts'
import { addSkillUsageLog, addSkillEffectLog } from '../../game/logUtils'
import { TUNE } from '../../../config/gameTuning'
import { ALL_CITIES, PROVINCE_MAP } from '../../../data/cities'
import { isCapitalCity, isPlanCity, isMunicipality, isSpecialAdministrativeRegion } from '../../../utils/cityDrawing'
import { debugLog } from '../../../utils/debug'

export function createExecuteZhongZhiChengCheng(gameStore) {
  return function executeZhongZhiChengCheng(caster, cityNames) {
    // 检查己方存活城市数是否≥3
    const aliveCities = Object.values(caster.cities).filter(c => c.isAlive !== false)
    if (aliveCities.length < TUNE.zhongZhiChengCheng.minCities) {
      return {
        success: false,
        message: '己方城市数需要≥3才能使用众志成城'
      }
    }

    if (!cityNames || cityNames.length < TUNE.zhongZhiChengCheng.minSelect || cityNames.length > TUNE.zhongZhiChengCheng.maxSelect) {
      return { success: false, message: '需要选择3-5个城市' }
    }

    const cities = cityNames.map(cityName => caster.cities[cityName]).filter(c => c && c.isAlive !== false)

    if (cities.length < TUNE.zhongZhiChengCheng.minSelect) {
      return { success: false, message: '选择的存活城市数量不足3个' }
    }

    // 金币检查和扣除
    const goldCheck = checkAndDeductGold('众志成城', caster, gameStore)
    if (!goldCheck.success) {
      return goldCheck
    }

    // 计算总HP并平均分配
    const totalHp = cities.reduce((sum, c) => sum + (c.currentHp || c.hp), 0)
    const avgHp = Math.floor(totalHp / cities.length)

    cities.forEach(city => {
      city.currentHp = avgHp
    })

    // 双日志
    addSkillUsageLog(
      gameStore,
      caster.name,
      '众志成城',
      `${caster.name}使用众志成城，${cities.length}个城市HP平均为${avgHp}`,
      `${caster.name}使用了众志成城`
    )

    return {
      success: true,
      message: `${cities.length}个城市HP已平均分配为${avgHp}`
    }
  }
}
