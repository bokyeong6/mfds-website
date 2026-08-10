'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function PharmaStats() {
  const cachedStats = useAppStore((state) => state.cachedStats);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const donutData = useMemo(() => cachedStats?.donutData || [], [cachedStats]);
  const compareData = useMemo(() => cachedStats?.compareData || [], [cachedStats]);
  
  const storageStatsData = useMemo(() => {
    const list = cachedStats?.storageStatsList || [];
    const totalSpecimens = list.reduce((acc: number, curr: any) => acc + curr.total, 0);
    return {
      list,
      totalSpecimens,
      totalRegistered: cachedStats?.storageTotals?.totalRegistered || 0,
      totalKp: cachedStats?.storageTotals?.totalKp || 0,
      totalKhp: cachedStats?.storageTotals?.totalKhp || 0,
      totalBoth: cachedStats?.storageTotals?.totalBoth || 0,
    };
  }, [cachedStats]);

  const testMethodData = useMemo(() => cachedStats?.testMethodData || [], [cachedStats]);
  const quantMethodData = useMemo(() => cachedStats?.quantMethodData || [], [cachedStats]);
  const columnCompletenessData = useMemo(() => cachedStats?.columnCompletenessData || [], [cachedStats]);
  const typeStatsData = useMemo(() => cachedStats?.typeStatsData || [], [cachedStats]);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Cool emerald and slate palette
  const DONUT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#475569'];
  const PIE_COLORS = ['#10b981', '#059669', '#3b82f6', '#2563eb', '#8b5cf6', '#6366f1', '#64748b'];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Donut Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
              표본 데이터 공정서 등재 비율
            </h3>
            <p className="text-xs text-slate-500 mb-4">표본통합 파일의 공정서 열 기준 분포</p>
          </div>
          <div className="h-[280px] w-full text-xs relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                    label={({ percent }) => `${((percent || 0) * 100).toFixed(1)}%`}
                  >
                  {donutData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-4 border-t border-slate-200 pt-4">
            {donutData.map((d: any, index: number) => {
              const total = cachedStats?.totalSpecimensCount || 1;
              const pct = ((d.value / total) * 100).toFixed(1);
              return (
                <div key={d.name} className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded shrink-0"
                    style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                  ></span>
                  <span className="truncate">{d.name}: {d.value.toLocaleString()}건 ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: KP vs KHP compare bar chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
              공정서(KP, KHP) 품목 및 표본 보유 비교
            </h3>
            <p className="text-xs text-slate-500 mb-4">공정서 등록 품목 중 제주센터에 실물 표본이 있는 품목 비교</p>
          </div>
          <div className="h-[280px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={compareData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#475569' }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#475569' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
                />
                <Legend iconType="circle" wrapperStyle={{ color: '#475569' }} />
                <Bar dataKey="전체 공정서 품목" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="표본 보유 품목" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-slate-600 mt-2 border-t border-slate-200 pt-3 space-y-1">
            <p className="leading-relaxed">
              KP 등재 품목은 {compareData[0] ? compareData[0]['전체 공정서 품목'] : 0}개이며, 이 중 약{' '}
              {compareData[0]
                ? ((compareData[0]['표본 보유 품목'] / (compareData[0]['전체 공정서 품목'] || 1)) * 100).toFixed(1)
                : 0}
              %의 실물 표본을 확보했습니다.
            </p>
            <p className="leading-relaxed">
              KHP 등재 품목은 {compareData[1] ? compareData[1]['전체 공정서 품목'] : 0}개이며, 이 중 약{' '}
              {compareData[1]
                ? ((compareData[1]['표본 보유 품목'] / (compareData[1]['전체 공정서 품목'] || 1)) * 100).toFixed(1)
                : 0}
              %의 실물 표본을 확보했습니다.
            </p>
            <p className="leading-relaxed text-[11px] text-slate-500 pt-1 border-t border-dashed border-slate-100">
              * 전체 공정서 품목({cachedStats?.totalPharmacopoeiaCount || 0}개) 대비 실물 표본 확보율은{' '}
              {(cachedStats?.totalPharmacopoeiaCount || 0) > 0
                ? ((( (compareData[0]?.['표본 보유 품목'] || 0) + (compareData[1]?.['표본 보유 품목'] || 0) ) / (cachedStats?.totalPharmacopoeiaCount || 1)) * 100).toFixed(1)
                : 0}
              % 입니다.
            </p>
          </div>
        </div>

        {/* Option 4: Storage vs Pharmacopoeia Registered Specimens Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
            수장고별 공정서 등재 표본 보유 현황
          </h3>
          <p className="text-xs text-slate-500 mb-4">각 수장고별 전체 표본 수 대비 공정서(KP, KHP) 규격 품목에 매칭되는 등재 표본 비율</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-650">
              <thead className="bg-slate-50 text-slate-550 uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">수장고 구분</th>
                  <th className="px-3 py-2.5 text-right">보유 표본 총합</th>
                  <th className="px-3 py-2.5 text-right">공정서 등재 표본</th>
                  <th className="px-3 py-2.5 text-center">KP / KHP 등재 비율</th>
                  <th className="px-3 py-2.5 text-right">수장고 전체 등재 비율 (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {storageStatsData.list.map((row: any) => (
                  <tr key={row.storageName} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 font-semibold text-slate-800">{row.storageName}</td>
                    <td className="px-3 py-3 text-right font-mono text-slate-600">{row.total.toLocaleString()}건</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-emerald-600">{row.registered.toLocaleString()}건</td>
                    {/* Column 4: KP & KHP Breakdown (Single Line) */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono">
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200/50">
                          KP {row.kpRatio}% ({row.kp.toLocaleString()}건)
                        </span>
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200/50">
                          KHP {row.khpRatio}% ({row.khp.toLocaleString()}건)
                        </span>
                      </div>
                    </td>
                    {/* Column 5: Total Registration Ratio + Dual Bar */}
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 font-mono">
                        <span className="font-bold text-slate-800 text-xs">
                          {row.storageRatio}%
                        </span>
                        <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden flex shrink-0">
                          <div 
                            className="bg-emerald-500 h-full" 
                            style={{ width: `${Math.min(100, parseFloat(row.kpRatio))}%` }}
                            title={`KP: ${row.kpRatio}%`}
                          ></div>
                          <div 
                            className="bg-blue-500 h-full" 
                            style={{ width: `${Math.min(100, parseFloat(row.khpRatio))}%` }}
                            title={`KHP: ${row.khpRatio}%`}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Total Footer Row */}
                <tr className="bg-slate-50/60 font-bold border-t border-slate-300 text-slate-850">
                  <td className="px-3 py-3">합계</td>
                  <td className="px-3 py-3 text-right font-mono">
                    {storageStatsData.totalSpecimens.toLocaleString()}건
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-emerald-700">
                    {storageStatsData.totalRegistered.toLocaleString()}건
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-[11px] font-mono">
                      <span className="text-emerald-700 font-semibold">
                        KP {((storageStatsData.totalKp / (storageStatsData.totalSpecimens || 1)) * 100).toFixed(1)}% ({storageStatsData.totalKp.toLocaleString()}건)
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-blue-700 font-semibold">
                        KHP {((storageStatsData.totalKhp / (storageStatsData.totalSpecimens || 1)) * 100).toFixed(1)}% ({storageStatsData.totalKhp.toLocaleString()}건)
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 font-mono">
                      <span className="text-xs font-bold text-slate-800">
                        {((storageStatsData.totalRegistered / (storageStatsData.totalSpecimens || 1)) * 100).toFixed(1)}%
                      </span>
                      <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden flex shrink-0">
                        <div 
                          className="bg-emerald-500 h-full" 
                          style={{ width: `${Math.min(100, (storageStatsData.totalKp / (storageStatsData.totalSpecimens || 1)) * 100)}%` }}
                          title="KP 평균"
                        ></div>
                        <div 
                          className="bg-blue-500 h-full" 
                          style={{ width: `${Math.min(100, (storageStatsData.totalKhp / (storageStatsData.totalSpecimens || 1)) * 100)}%` }}
                          title="KHP 평균"
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart 6: Specimen Count by Herb Type (식물성, 동물성, 광물성 등) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
            공정서 품목 형태별(식물성·동물성·광물성) 전체 품목 및 표본 보유 품목 통계
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Chart */}
            <div className="h-[280px] w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={typeStatsData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#475569' }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#475569' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ color: '#475569' }} />
                  <Bar dataKey="전체 품목 수" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="표본 보유 품목 수" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table Details */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-650">
                <thead className="bg-slate-50 text-slate-550 uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">형태 구분</th>
                    <th className="px-3 py-2">전체 품목</th>
                    <th className="px-3 py-2">표본 보유 품목</th>
                    <th className="px-3 py-2">보유 표본 수</th>
                    <th className="px-3 py-2">보유 비율 (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {typeStatsData.map((row: any) => (
                    <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{row.name}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-600">{row['전체 품목 수']}개</td>
                      <td className="px-3 py-2.5 font-mono text-slate-600">{row['표본 보유 품목 수']}개</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-emerald-600">{row['보유 표본 수'].toLocaleString()}건</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-slate-700">{row.ratio}%</span>
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div 
                              className="bg-emerald-500 h-full rounded-full" 
                              style={{ width: `${Math.min(100, parseFloat(row.ratio))}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Chart 3: Pie Chart of test methods */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
            공정서 등재 품목별 확인시험 방법 분포
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-[280px] w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={testMethodData}
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    dataKey="value"
                    labelLine={false}
                    isAnimationActive={false}
                  >
                    {testMethodData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
              {testMethodData.map((m: any, index: number) => (
                <div key={m.name} className="flex items-center justify-between text-xs border-b border-slate-200 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    ></span>
                    <span className="text-slate-700 font-medium truncate max-w-[200px]">{m.name}</span>
                  </div>
                  <span className="text-slate-500 font-mono">
                    {m.value}건 ({((m.value / (cachedStats?.totalPharmacopoeiaCount || 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 4: Pie Chart of quantitative methods */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
            공정서 등재 품목별 정량법 방법 분포
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-[280px] w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={quantMethodData}
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    dataKey="value"
                    labelLine={false}
                    isAnimationActive={false}
                  >
                    {quantMethodData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
              {quantMethodData.map((m: any, index: number) => (
                <div key={m.name} className="flex items-center justify-between text-xs border-b border-slate-200 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    ></span>
                    <span className="text-slate-700 font-medium truncate max-w-[200px]">{m.name}</span>
                  </div>
                  <span className="text-slate-500 font-mono">
                    {m.value}건 ({((m.value / (cachedStats?.totalPharmacopoeiaCount || 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 5: Other test requirements ratio (순도시험, 건조감량, 회분, 산불용성회분, 엑스함량, 정유함량) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
            주요 검사 항목별 공정서 등재 비율 통계 (순도시험·건조감량·회분·산불용성회분·엑스함량·정유함량)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Chart */}
            <div className="h-[280px] w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={columnCompletenessData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" tick={{ fill: '#475569' }} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fill: '#475569' }} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
                    formatter={(value) => [`${value}%`, '등재 비율']}
                  />
                  <Bar dataKey="ratio" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="등재 비율 (%)" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table Details */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-650">
                <thead className="bg-slate-50 text-slate-550 uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">검사 항목</th>
                    <th className="px-3 py-2">기재 품목 수</th>
                    <th className="px-3 py-2">미기재 품목 수</th>
                    <th className="px-3 py-2">기재 비율 (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {columnCompletenessData.map((row: any) => (
                    <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{row.name}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-600 font-bold text-emerald-600">{row['기재 품목 수']}개</td>
                      <td className="px-3 py-2.5 font-mono text-slate-400">{row['미기재 품목 수']}개</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-slate-700">{row.ratio}%</span>
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div 
                              className="bg-violet-500 h-full rounded-full" 
                              style={{ width: `${row.ratio}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
