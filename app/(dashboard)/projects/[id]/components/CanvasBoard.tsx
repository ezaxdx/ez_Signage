'use client'

import { useEffect, useRef, useCallback } from 'react'
import { calcCanvasDimensions } from '@/lib/constants'
import type { DesignItem, ContentsMap, SlotContent, SlotStylesMap } from '@/lib/types'

interface Props {
  item: DesignItem | null
  contents: ContentsMap
  slotStyles?: SlotStylesMap
  selectedSlotKey?: string | null
  onUpdate: (slotKey: string, updated: SlotContent) => void
  onSlotSelect?: (key: string) => void
}

interface FabricInstance {
  canvas: any
  fabric: typeof import('fabric')['fabric']
}

interface BgCache {
  img: any
  naturalW: number
  naturalH: number
}

function buildDisplayText(slot: SlotContent): string {
  if (slot.ko && slot.en) return `${slot.ko}\n${slot.en}`
  if (slot.ko || slot.en) return slot.ko || slot.en
  // 비어있음 — placeholder 힌트 사용, 없으면 라벨
  if (slot.placeholder) return `📝 ${slot.placeholder}`
  return `📝 ${slot.label ?? '내용 입력'}`
}

function isSlotEmpty(slot: SlotContent): boolean {
  return !(slot.ko || slot.en)
}

export function CanvasBoard({ item, contents, slotStyles = {}, selectedSlotKey, onUpdate, onSlotSelect }: Props) {
  const outerRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<FabricInstance | null>(null)
  const textMapRef = useRef<Map<string, any>>(new Map())
  const imageMapRef = useRef<Map<string, any[]>>(new Map())  // slotKey → Fabric Image[] (후원사 로고 등 다중)
  const bgCacheRef = useRef<BgCache | null>(null)

  // 최신값 ref (클로저 stale 방지)
  const contentsRef = useRef<ContentsMap>(contents)
  const slotStylesRef = useRef<SlotStylesMap>(slotStyles)
  const onUpdateRef = useRef(onUpdate)
  const onSlotSelectRef = useRef(onSlotSelect)
  const itemRef = useRef(item)
  const selectedSlotKeyRef = useRef(selectedSlotKey)
  useEffect(() => { contentsRef.current = contents }, [contents])
  useEffect(() => { slotStylesRef.current = slotStyles }, [slotStyles])
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])
  useEffect(() => { onSlotSelectRef.current = onSlotSelect }, [onSlotSelect])
  useEffect(() => { itemRef.current = item }, [item])
  useEffect(() => { selectedSlotKeyRef.current = selectedSlotKey }, [selectedSlotKey])

  // ── 캔버스 크기 계산 및 적용 ────────────────────────────
  const resizeCanvas = useCallback((canvas: any) => {
    const outer = outerRef.current
    if (!outer) return

    const { offsetWidth: cw, offsetHeight: ch } = outer
    const it = itemRef.current
    const { w, h } = calcCanvasDimensions(
      cw, ch,
      it?.width_mm ?? 600,
      it?.height_mm ?? 1800
    )

    canvas.setWidth(w)
    canvas.setHeight(h)

    if (bgCacheRef.current) {
      bgCacheRef.current.img.set({
        scaleX: w / bgCacheRef.current.naturalW,
        scaleY: h / bgCacheRef.current.naturalH,
      })
      canvas.setBackgroundImage(
        bgCacheRef.current.img,
        canvas.renderAll.bind(canvas)
      )
    }

    // % 좌표 + 너비/높이 기반 텍스트 재배치
    for (const [slotKey, obj] of Array.from(textMapRef.current.entries())) {
      const slot = contentsRef.current[slotKey]
      if (!slot) continue
      const objW = slot.w !== undefined ? (slot.w / 100) * w : w * 0.7
      obj.set({
        left: (slot.x / 100) * w,
        top: (slot.y / 100) * h,
        width: objW,
        scaleY: slot.h ?? 1,
      })
      obj.setCoords()
    }

    if (wrapRef.current) {
      wrapRef.current.style.width = `${w}px`
      wrapRef.current.style.height = `${h}px`
    }

    canvas.renderAll()
  }, [])

  // ── 슬롯 내부 이미지 동기화 (다중 이미지 그리드) ──────────
  const syncSlotImages = useCallback(
    (canvas: any, fabricLib: any, map: ContentsMap) => {
      const cw = (canvas.width as number) || 1
      const ch = (canvas.height as number) || 1

      // 기존 이미지 전부 제거 후 재생성 (간단 + 안정)
      for (const imgs of Array.from(imageMapRef.current.values())) {
        for (const im of imgs) canvas.remove(im)
      }
      imageMapRef.current.clear()

      for (const [slotKey, slot] of Object.entries(map)) {
        const imageUrls = slot.images ?? []
        if (imageUrls.length === 0) continue

        const slotW = (slot.w ?? 70) / 100 * cw
        const slotH = Math.max(30, ch * 0.12 * (slot.h ?? 1))
        const cx = (slot.x / 100) * cw
        const top = (slot.y / 100) * ch

        // 이미지 가로 배치 (후원사 로고 줄)
        const per = slotW / imageUrls.length
        const objs: any[] = []
        imageMapRef.current.set(slotKey, objs)

        imageUrls.forEach((url, idx) => {
          fabricLib.Image.fromURL(
            url,
            (img: any) => {
              if (!img) return
              // 최대한 꽉 채우기 — 박스 내부 98% 사용 (contain 방식, 비율 유지)
              const maxW = per * 0.98
              const maxH = slotH * 0.98
              const scale = Math.min(maxW / img.width, maxH / img.height)
              img.set({
                left: cx - slotW / 2 + per * idx + per / 2,
                top: top + slotH / 2,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                selectable: false,
                evented: false,
              })
              ;(img as any).__slotKey = slotKey
              canvas.add(img)
              objs.push(img)
              canvas.renderAll()
            },
            { crossOrigin: 'anonymous' }
          )
        })
      }
    },
    []
  )

  // ── Textbox 오브젝트 동기화 ──────────────────────────────
  const syncTextObjects = useCallback(
    (canvas: any, fabricLib: any, map: ContentsMap) => {
      const existingKeys = Array.from(textMapRef.current.keys())
      const incomingKeySet = new Set(Object.keys(map))

      for (const key of existingKeys) {
        if (!incomingKeySet.has(key)) {
          const obj = textMapRef.current.get(key)
          if (obj) canvas.remove(obj)
          textMapRef.current.delete(key)
        }
      }

      const cw = (canvas.width as number) || 1
      const ch = (canvas.height as number) || 1

      // 슬롯별 최대 글자 수 (overflow 자동 축소용)
      const SLOT_MAX: Record<string, number> = {
        header_brand: 40, hero_title: 60, sub_title: 80, body: 200,
        arrow: 40, qr_code: 30, footer_credits: 100,
      }

      for (const [slotKey, rawSlot] of Object.entries(map)) {
        // 마스터 스타일 적용 — ko/en/images 제외, 나머지는 slot_styles가 덮어씀
        const master = slotStylesRef.current[slotKey]
        const slot: typeof rawSlot = {
          ...rawSlot,
          x: master?.master_x ?? rawSlot.x,
          y: master?.master_y ?? rawSlot.y,
          w: master?.master_w ?? rawSlot.w,
          fontSize: master?.font_size ?? rawSlot.fontSize,
        }

        // 이미지만 있는 슬롯은 텍스트 객체 생성 건너뜀 (이미지로 대체)
        const hasImages = slot.images && slot.images.length > 0
        const hasText = !!(slot.ko || slot.en)
        if (hasImages && !hasText) {
          // 기존 텍스트 객체 있으면 제거
          if (textMapRef.current.has(slotKey)) {
            const old = textMapRef.current.get(slotKey)
            if (old) canvas.remove(old)
            textMapRef.current.delete(slotKey)
          }
          continue
        }
        const text = buildDisplayText(slot)
        const left = (slot.x / 100) * cw
        const top = (slot.y / 100) * ch
        const baseFontSize = slot.fontSize || 16
        const objW = slot.w !== undefined ? (slot.w / 100) * cw : cw * 0.7
        const scaleY = slot.h ?? 1

        // 서식(마스터 + 개별 override) — 측정·렌더링 공통 사용
        const style = slotStylesRef.current[slotKey]
        const fill       = rawSlot.color    ? `#${rawSlot.color}`    : (style?.color ? `#${style.color}` : '#ffffff')
        const fontFamily = rawSlot.fontFace ?? style?.font_face ?? 'Arial, sans-serif'
        const textAlign  = rawSlot.align    ?? style?.align     ?? 'center'
        const letterSpacing = style?.letter_spacing ?? 0

        // ── 객체 꽉 채우기 (auto-fit) ────────────────────
        const maxChars = SLOT_MAX[slotKey]
        const textLen = text.length || 1
        let fontSize = baseFontSize
        if (maxChars && textLen > maxChars) {
          const shrinkRatio = Math.max(0.4, maxChars / textLen)
          fontSize = Math.max(8, Math.round(baseFontSize * shrinkRatio))
        }

        // 실측 fitting — canvas context로 텍스트 너비 측정
        try {
          const measureCanvas = document.createElement('canvas')
          const measureCtx = measureCanvas.getContext('2d')
          if (measureCtx) {
            measureCtx.font = `${fontSize}px ${fontFamily}`
            const longestLine = text.split('\n').reduce((a, b) => a.length > b.length ? a : b, '')
            const measured = measureCtx.measureText(longestLine).width
            const targetW = objW - 10
            if (measured > 0 && measured < targetW * 0.8) {
              const upscale = Math.min(targetW * 0.95 / measured, 2)
              fontSize = Math.min(120, Math.round(fontSize * upscale))
            } else if (measured > targetW) {
              fontSize = Math.max(8, Math.round(fontSize * targetW / measured))
            }
          }
        } catch {}

        const isHighlighted = selectedSlotKeyRef.current === slotKey
        const empty = isSlotEmpty(rawSlot)
        // 빈 슬롯: 더 진한 점선 배경 (사용자에게 "여기에 입력" 시각적 표시)
        const bgColor = empty
          ? (isHighlighted ? 'rgba(251,191,36,0.22)' : 'rgba(251,191,36,0.10)')   // amber for empty
          : (isHighlighted ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.10)')    // indigo for filled
        // 빈 슬롯이면 실제 텍스트 색상은 옅게, 내용 있으면 본 색상
        const textFillOverride = empty ? 'rgba(255,255,255,0.55)' : undefined

        // Fabric charSpacing: 1/1000 em 단위 (1pt 자간 ≈ charSpacing 50)
        const charSpacing = letterSpacing * 50

        const finalFill = textFillOverride ?? fill

        if (textMapRef.current.has(slotKey)) {
          const obj = textMapRef.current.get(slotKey)!
          if ((obj as any).isEditing) continue
          obj.set({ text, left, top, fontSize, fill: finalFill, fontFamily, textAlign, charSpacing, backgroundColor: bgColor, width: objW, scaleY })
          obj.setCoords()
        } else {
          const obj = new fabricLib.Textbox(text, {
            left,
            top,
            width: objW,
            scaleY,
            fontSize,
            fill: finalFill,
            fontFamily,
            textAlign,
            charSpacing,
            originX: 'center',
            originY: 'top',
            selectable: true,
            hasControls: true,
            lockRotation: true,
            padding: 5,
            backgroundColor: bgColor,
            borderColor: 'rgba(99,102,241,0.6)',
            editingBorderColor: 'rgba(99,102,241,0.8)',
            splitByGrapheme: true,  // 한글 문자 단위 줄바꿈 허용 (빈칸 없어도 자유로운 줄바꿈)
          })
          // 좌우(너비) + 상하(높이) 핸들만 표시, 모서리·회전 숨김
          obj.setControlsVisibility({
            tl: false, tr: false, bl: false, br: false,
            mt: true,  mb: true,
            ml: true,  mr: true,
            mtr: false,
          })
          ;(obj as any).__slotKey = slotKey
          canvas.add(obj)
          textMapRef.current.set(slotKey, obj)
        }
      }

      canvas.renderAll()
    },
    []
  )

  // ── Fabric 초기화 (1회) ──────────────────────────────────
  useEffect(() => {
    if (!canvasElRef.current || !outerRef.current) return
    let disposed = false

    import('fabric').then(({ fabric }) => {
      if (disposed || !canvasElRef.current) return

      const canvas = new fabric.Canvas(canvasElRef.current, {
        backgroundColor: '#0f172a',
        selection: true,
        preserveObjectStacking: true,
      })

      instanceRef.current = { canvas, fabric }
      resizeCanvas(canvas)

      // ── 드래그 이동: 캔버스 밖으로 못 나가게 클램핑 ──────
      canvas.on('object:moving', (e: any) => {
        const obj = e.target
        if (!(obj as any).__slotKey) return
        const cw = (canvas.width as number) || 1
        const ch = (canvas.height as number) || 1
        const halfW = obj.getScaledWidth() / 2
        const objH = obj.getScaledHeight()
        obj.left = Math.max(halfW, Math.min(cw - halfW, obj.left))
        obj.top  = Math.max(0, Math.min(ch - objH, obj.top))
      })

      // ── 리사이즈 중: 범위 클램핑 + 반응형 폰트 실시간 적용 ──
      canvas.on('object:scaling', (e: any) => {
        const obj = e.target
        const slotKey = (obj as any).__slotKey
        if (!slotKey) return
        const cw = (canvas.width as number) || 1
        const ch = (canvas.height as number) || 1
        const scaledW = obj.getScaledWidth()
        const scaledH = obj.getScaledHeight()

        // 캔버스 이탈 방지
        if (scaledW > cw) obj.scaleX = cw / obj.width
        if (scaledH > ch - obj.top) obj.scaleY = (ch - obj.top) / obj.height

        // 실시간 폰트 재조정 — 너비 변화율만큼 fontSize 즉시 반영
        const slot = contentsRef.current[slotKey]
        if (slot) {
          const originalWPct = slot.w ?? 70
          const currentWPct = (obj.width / cw) * 100
          if (originalWPct > 0 && currentWPct > 0) {
            const ratio = currentWPct / originalWPct
            const base = slot.fontSize ?? 16
            const newSize = Math.max(8, Math.min(120, Math.round(base * ratio)))
            if (!(obj as any).isEditing && obj.fontSize !== newSize) {
              obj.set({ fontSize: newSize })
            }
          }
        }
      })

      // ── 드래그/리사이즈 완료 → 위치 + 너비 + 높이 + 반응형 폰트 ──
      canvas.on('object:modified', (e: any) => {
        const obj = e.target
        const slotKey: string | undefined = (obj as any).__slotKey
        if (!slotKey) return
        const slot = contentsRef.current[slotKey]
        if (!slot) return

        const cw = (canvas.width as number) || 1
        const ch = (canvas.height as number) || 1
        const xPct = parseFloat(((obj.left / cw) * 100).toFixed(1))
        const yPct = parseFloat(((obj.top  / ch) * 100).toFixed(1))
        const wPct = parseFloat(((obj.width  / cw) * 100).toFixed(1))
        const hVal = parseFloat((obj.scaleY ?? 1).toFixed(3))

        // 반응형 폰트 — 박스 너비 변경 비율에 따라 fontSize 자동 조정
        // 원본 대비 너비 변화율을 적용하되 min 8, max 120으로 제한
        const originalWPct = slot.w ?? 70
        const widthRatio = wPct / originalWPct
        let newFontSize = slot.fontSize ?? 16
        if (widthRatio !== 1 && originalWPct > 0) {
          newFontSize = Math.max(8, Math.min(120, Math.round(newFontSize * widthRatio)))
        }

        onUpdateRef.current(slotKey, { ...slot, x: xPct, y: yPct, w: wPct, h: hVal, fontSize: newFontSize })
      })

      // 슬롯 클릭 → SlotPanel 선택 동기화
      canvas.on('selection:created', (e: any) => {
        const obj = e.selected?.[0]
        const slotKey: string | undefined = obj?.__slotKey
        if (slotKey) onSlotSelectRef.current?.(slotKey)
      })
      canvas.on('selection:updated', (e: any) => {
        const obj = e.selected?.[0]
        const slotKey: string | undefined = obj?.__slotKey
        if (slotKey) onSlotSelectRef.current?.(slotKey)
      })

      // 텍스트 직접 편집 완료 → 첫 줄=ko, 나머지=en
      canvas.on('text:editing:exited', (e: any) => {
        const obj = e.target
        const slotKey: string | undefined = (obj as any).__slotKey
        if (!slotKey) return
        const slot = contentsRef.current[slotKey]
        if (!slot) return
        const parts = (obj.text as string).split('\n')
        const ko = parts[0] ?? ''
        const en = parts.slice(1).join('\n')
        if (ko !== slot.ko || en !== slot.en) {
          onUpdateRef.current(slotKey, { ...slot, ko, en })
        }
      })

      syncTextObjects(canvas, fabric, contentsRef.current)
    })

    const ro = new ResizeObserver(() => {
      if (instanceRef.current) resizeCanvas(instanceRef.current.canvas)
    })
    if (outerRef.current) ro.observe(outerRef.current)

    return () => {
      disposed = true
      ro.disconnect()
      instanceRef.current?.canvas.dispose()
      instanceRef.current = null
      textMapRef.current.clear()
      imageMapRef.current.clear()
    }
  }, [resizeCanvas, syncTextObjects])

  useEffect(() => {
    if (instanceRef.current) resizeCanvas(instanceRef.current.canvas)
  }, [item?.width_mm, item?.height_mm, resizeCanvas])

  // ── 배경 이미지 변경 ────────────────────────────────────
  useEffect(() => {
    const instance = instanceRef.current
    if (!instance) return
    const { canvas, fabric } = instance

    if (!item?.image_url) {
      bgCacheRef.current = null
      canvas.setBackgroundImage(null as any, canvas.renderAll.bind(canvas))
      canvas.backgroundColor = '#0f172a'
      canvas.renderAll()
      return
    }

    fabric.Image.fromURL(
      item.image_url,
      (img: any) => {
        if (!img || !instanceRef.current) return
        const c = instanceRef.current.canvas
        const cw = (c.width as number) || 1
        const ch = (c.height as number) || 1
        bgCacheRef.current = { img, naturalW: img.width, naturalH: img.height }
        img.set({ scaleX: cw / img.width, scaleY: ch / img.height })
        c.setBackgroundImage(img, c.renderAll.bind(c))
      },
      { crossOrigin: 'anonymous' }
    )
  }, [item?.image_url])

  // ── contents 또는 slotStyles 변경 → 텍스트 + 이미지 동기화 ──
  useEffect(() => {
    const instance = instanceRef.current
    if (!instance) return
    syncTextObjects(instance.canvas, instance.fabric, contents)
    syncSlotImages(instance.canvas, instance.fabric, contents)
  }, [contents, slotStyles, syncTextObjects, syncSlotImages])

  // ── selectedSlotKey 변경 → 하이라이트 갱신 ──────────────
  useEffect(() => {
    const instance = instanceRef.current
    if (!instance) return
    for (const [key, obj] of Array.from(textMapRef.current.entries())) {
      obj.set({ backgroundColor: key === selectedSlotKey ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.10)' })
    }
    instance.canvas.renderAll()
  }, [selectedSlotKey])

  return (
    <div
      ref={outerRef}
      className="w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(51,65,85,0.4) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div ref={wrapRef} className="relative shadow-2xl ring-1 ring-slate-700/50">
        <canvas ref={canvasElRef} />
        {item?.width_mm && item?.height_mm && (
          <div className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-slate-600 font-mono pointer-events-none">
            {item.width_mm} × {item.height_mm} mm{item.category ? ` · ${item.category}` : ''}
          </div>
        )}
      </div>

      {!item && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
              <path strokeLinecap="round" strokeWidth="1.5" d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <p className="text-slate-600 text-sm">왼쪽에서 제작물을 선택하세요</p>
        </div>
      )}
    </div>
  )
}
