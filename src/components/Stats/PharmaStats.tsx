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
  const specimens = useAppStore((state) => state.specimens);
  const pharmacopoeia = useAppStore((state) => state.pharmacopoeia);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Chart 1: Donut chart of ratio in specimens (KP / KHP / KP, KHP / 미등재)
  const donutData = useMemo(() => {
    console.time('PharmaStats:donutData');
    let kp = 0;
    let khp = 0;
    let both = 0;
    let none = 0;

    specimens.forEach((s) => {
      const pharm = s.pharmacopoeia ? s.pharmacopoeia.trim().toUpperCase() : '';
      if (pharm === 'KP') {
        kp++;
      } else if (pharm === 'KHP') {
        khp++;
      } else if (pharm.includes('KP') && pharm.includes('KHP')) {
        both++;
      } else {
        none++;
      }
    });

    const result = [
      { name: 'KP 등재', value: kp },
      { name: 'KHP 등재', value: khp },
      { name: 'KP & KHP 공동 등재', value: both },
      { name: '미등재 표본', value: none },
    ];
    console.timeEnd('PharmaStats:donutData');
    return result;
  }, [specimens]);

  // Chart 2: KP vs KHP 품목 수 비교 (총 품목 vs 제주센터 표본 있는 품목)
  const compareData = useMemo(() => {
    console.time('PharmaStats:compareData');
    let kpTotal = 0;
    let khpTotal = 0;
    let kpWithSpecimens = 0;
    let khpWithSpecimens = 0;

    pharmacopoeia.forEach((p) => {
      const type = p.pharmacopoeia ? p.pharmacopoeia.trim().toUpperCase() : '';
      const hasSpecimen = p.specimenIds && p.specimenIds.length > 0;

      if (type === 'KP') {
        kpTotal++;
        if (hasSpecimen) kpWithSpecimens++;
      } else if (type === 'KHP') {
        khpTotal++;
        if (hasSpecimen) khpWithSpecimens++;
      }
    });

    const result = [
      {
        name: 'KP',
        '전체 공정서 품목': kpTotal,
        '표본 보유 품목': kpWithSpecimens,
      },
      {
        name: 'KHP',
        '전체 공정서 품목': khpTotal,
        '표본 보유 품목': khpWithSpecimens,
      },
    ];
    console.timeEnd('PharmaStats:compareData');
    return result;
  }, [pharmacopoeia]);

  // Chart 3: 확인시험 방법 분포
  const testMethodData = useMemo(() => {
    console.time('PharmaStats:testMethodData');
    const methodMap = new Map<string, number>();

    pharmacopoeia.forEach((p) => {
      const test = p.confirmTest ? p.confirmTest.trim() : '';
      if (!test) {
        methodMap.set('미기재', (methodMap.get('미기재') || 0) + 1);
        return;
      }

      // Normalize common test methods for representation
      let normalized = '기타';
      const testUpper = test.toUpperCase();
      
      if (testUpper.includes('TLC') || test.includes('박층')) {
        normalized = 'TLC (박층크로마토그래피)';
      } else if (testUpper.includes('HPLC') || test.includes('액체크로마토')) {
        normalized = 'HPLC (액체크로마토그래피)';
      } else if (test.includes('정성') || test.includes('색반응') || test.includes('침전')) {
        normalized = '정성반응 (화학반응)';
      } else if (testUpper.includes('GC') || test.includes('기체크로마토')) {
        normalized = 'GC (기체크로마토그래피)';
      } else if (testUpper.includes('UV') || test.includes('흡광도')) {
        normalized = 'UV 분광학법';
      } else if (test.length < 12) {
        normalized = test; // Keep short descriptive methods
      }

      methodMap.set(normalized, (methodMap.get(normalized) || 0) + 1);
    });

    const result = Array.from(methodMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    console.timeEnd('PharmaStats:testMethodData');
    return result;
  }, [pharmacopoeia]);

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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
              표본 데이터 공정서 등재 비율
            </h3>
            <p className="text-xs text-slate-500 mb-4">표본통합 파일의 `pharmacopoeia` 컬럼 기준 분포</p>
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
                  >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mt-4 border-t border-slate-800/60 pt-4">
            {donutData.map((d, index) => (
              <div key={d.name} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                ></span>
                <span className="truncate">{d.name}: {d.value.toLocaleString()}건</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: KP vs KHP compare bar chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
              공정서(KP vs KHP) 품목 및 표본 보유 비교
            </h3>
            <p className="text-xs text-slate-500 mb-4">공정서 등록 품목 중 제주센터에 실물 표본이 있는 품목 비교</p>
          </div>
          <div className="h-[280px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={compareData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8' }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                />
                <Legend iconType="circle" wrapperStyle={{ color: '#94a3b8' }} />
                <Bar dataKey="전체 공정서 품목" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="표본 보유 품목" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-slate-400 mt-2 border-t border-slate-800/60 pt-3">
            <p className="leading-relaxed">
              KP 등재 품목 중 약{' '}
              {compareData[0]
                ? ((compareData[0]['표본 보유 품목'] / (compareData[0]['전체 공정서 품목'] || 1)) * 100).toFixed(1)
                : 0}
              %의 실물 표본을 확보하고 있으며, KHP는{' '}
              {compareData[1]
                ? ((compareData[1]['표본 보유 품목'] / (compareData[1]['전체 공정서 품목'] || 1)) * 100).toFixed(1)
                : 0}
              % 확보하고 있습니다.
            </p>
          </div>
        </div>

        {/* Chart 3: Pie Chart of test methods */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
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
                    {testMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
              {testMethodData.map((m, index) => (
                <div key={m.name} className="flex items-center justify-between text-xs border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    ></span>
                    <span className="text-slate-300 font-medium truncate max-w-[200px]">{m.name}</span>
                  </div>
                  <span className="text-slate-500 font-mono">
                    {m.value}건 ({((m.value / (pharmacopoeia.length || 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
