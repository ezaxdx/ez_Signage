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
  onSlotPanelOpen?: () => void
  // v9.9: 회의록 ′마스터시안 = 모든 환경장식물에 배경 일괄 제공′
  masterImageUrl?: string | null
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
  // 1차: 빈 슬롯 placeholder 표시 안 함 (사용자 요청 — 기존 입력값만 보이게)
  return ''
}

function isSlotEmpty(slot: SlotContent): boolean {
  return !(slot.ko || slot.en)
}

export function CanvasBoard({ item, contents, slotStyles = {}, selectedSlotKey, onUpdate, onSlotSelect, onSlotPanelOpen, masterImageUrl }: Props) {
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
  const onSlotPanelOpenRef = useRef(onSlotPanelOpen)
  useEffect(() => { onSlotPanelOpenRef.current = onSlotPanelOpen }, [onSlotPanelOpen])

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

  // ── 슬롯 내부 이미지 동기화 (URL 기반 diff — race condition 방지) ─
  const imageKeyMapRef = useRef<Map<string, Map<string, any>>>(new Map())  // slotKey → (url → FabricImage)
  const syncSlotImages = useCallback(
    (canvas: any, fabricLib: any, map: ContentsMap) => {
      const cw = (canvas.width as number) || 1
      const ch = (canvas.height as number) || 1

      const incomingSlotKeys = new Set(Object.keys(map).filter(k => (map[k].images ?? []).length > 0))

      // 1) 제거된 슬롯의 이미지 정리
      for (const [slotKey, urlMap] of Array.from(imageKeyMapRef.current.entries())) {
        if (!incomingSlotKeys.has(slotKey)) {
          for (const im of Array.from(urlMap.values())) canvas.remove(im)
          imageKeyMapRef.current.delete(slotKey)
        }
      }

      for (const [slotKey, slot] of Object.entries(map)) {
        const imageUrls = slot.images ?? []
        if (imageUrls.length === 0) continue

        const slotW = (slot.w ?? 70) / 100 * cw
        const slotH = Math.max(30, ch * 0.12 * (slot.h ?? 1))
        const cx = (slot.x / 100) * cw
        const top = (slot.y / 100) * ch
        const per = slotW / imageUrls.length

        const existingUrlMap = imageKeyMapRef.current.get(slotKey) ?? new Map<string, any>()
        const incomingUrls = new Set(imageUrls)

        // 2) 더 이상 없는 URL의 이미지 제거
        for (const [url, img] of Array.from(existingUrlMap.entries())) {
          if (!incomingUrls.has(url)) {
            canvas.remove(img)
            existingUrlMap.delete(url)
          }
        }

        // 3) 기존 이미지 위치·스케일만 갱신 + 새 URL은 비동기 로드
        imageUrls.forEach((url, idx) => {
          const targetLeft = cx - slotW / 2 + per * idx + per / 2
          const targetTop = top + slotH / 2
          const maxW = per * 0.98
          const maxH = slotH * 0.98

          const existing = existingUrlMap.get(url)
          if (existing) {
            const scale = Math.min(maxW / existing.width, maxH / existing.height)
            existing.set({ left: targetLeft, top: targetTop, scaleX: scale, scaleY: scale })
            existing.setCoords()
          } else {
            fabricLib.Image.fromURL(
              url,
              (img: any) => {
                if (!img) return
                // 로드 완료 시점에 슬롯이 여전히 존재하는지 검증 (race 방지)
                if (!imageKeyMapRef.current.get(slotKey)) return
                const scale = Math.min(maxW / img.width, maxH / img.height)
                img.set({
                  left: targetLeft, top: targetTop,
                  originX: 'center', originY: 'center',
                  scaleX: scale, scaleY: scale,
                  selectable: false, evented: false,
                })
                ;(img as any).__slotKey = slotKey
                canvas.add(img)
                const curMap = imageKeyMapRef.current.get(slotKey) ?? new Map()
                curMap.set(url, img)
                imageKeyMapRef.current.set(slotKey, curMap)
                canvas.renderAll()
              },
              { crossOrigin: 'anonymous' }
            )
          }
        })
        // 항상 등록 (비어있어도) — 비동기 로드 callback의 guard가 올바르게 동작하도록
        imageKeyMapRef.current.set(slotKey, existingUrlMap)
      }
      canvas.renderAll()
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
        // 1차: 빈 슬롯 시각화 OFF (사용자 요청 — 기존 입력값만 보이게)
        // 빈 슬롯은 배경 투명 + 텍스트도 빈 문자열 → 사실상 안 보임
        const bgColor = empty
          ? 'transparent'
          : (isHighlighted ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.10)')
        const textFillOverride = empty ? 'rgba(0,0,0,0)' : undefined

        // Fabric charSpacing: 1/1000 em 단위. 폰트 크기에 비례해 시각적으로 일정하게
        // letterSpacing(pt) → px → em (fontSize 기준) → 1000배
        const charSpacing = fontSize > 0 ? Math.round((letterSpacing * 1000) / fontSize) : 0

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

      // ── 리사이즈 중: 범위 클램핑 (실시간 폰트 조정은 하지 않음) ──
      // 이유: object:modified에서 최종 크기 기준으로 한 번만 재계산해야 double-apply 방지
      canvas.on('object:scaling', (e: any) => {
        const obj = e.target
        if (!(obj as any).__slotKey) return
        ;(obj as any).__userResizing = true
        const cw = (canvas.width as number) || 1
        const ch = (canvas.height as number) || 1
        const scaledW = obj.getScaledWidth()
        const scaledH = obj.getScaledHeight()

        // 캔버스 이탈 방지 — scaleX/scaleY로 통일
        if (scaledW > cw) obj.scaleX = cw / obj.width
        if (scaledH > ch - obj.top) obj.scaleY = (ch - obj.top) / obj.height
      })

      // ── 드래그/리사이즈 완료 → 위치 + 너비 + 높이 + 반응형 폰트 (1회) ──
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
        // getScaledWidth() 사용 — Textbox는 scaleX 변경되므로 width만으로는 부정확
        const scaledW = obj.getScaledWidth()
        const wPct = parseFloat(((scaledW / cw) * 100).toFixed(1))
        const hVal = parseFloat((obj.scaleY ?? 1).toFixed(3))

        // scaleX가 1 아니면 width × scaleX로 저장한 후 scaleX=1로 정규화
        // (다음 렌더 때 width 기반 재계산이 정확하도록)
        if (obj.scaleX !== 1) {
          obj.set({ width: scaledW, scaleX: 1 })
        }

        // 반응형 폰트: 사용자 리사이즈일 때만 박스 변화율 적용
        const wasUserResizing = !!(obj as any).__userResizing
        let newFontSize = slot.fontSize ?? 16
        if (wasUserResizing) {
          const originalWPct = slot.w ?? 70
          const widthRatio = originalWPct > 0 ? wPct / originalWPct : 1
          if (widthRatio !== 1) {
            newFontSize = Math.max(8, Math.min(120, Math.round(newFontSize * widthRatio)))
          }
          ;(obj as any).__userResizing = false
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

      // 더블클릭 → 해당 구역 선택 + SlotPanel 열기
      canvas.on('mouse:dblclick', (e: any) => {
        const obj = e.target
        const slotKey: string | undefined = (obj as any)?.__slotKey
        if (slotKey) {
          onSlotSelectRef.current?.(slotKey)
          onSlotPanelOpenRef.current?.()
        }
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
      imageKeyMapRef.current.clear()
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

    // v9.9: 회의록 ′마스터 시안 = 모든 환경장식물 배경 일괄 제공′
    // 개별 item.image_url 우선 → 없으면 project.master_image_url 사용
    const bgUrl = item?.image_url || masterImageUrl || null
    if (!bgUrl) {
      bgCacheRef.current = null
      canvas.setBackgroundImage(null as any, canvas.renderAll.bind(canvas))
      canvas.backgroundColor = '#ffffff'
      canvas.renderAll()
      return
    }

    fabric.Image.fromURL(
      bgUrl,
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
  }, [item?.image_url, masterImageUrl])

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
      className="w-full h-full flex items-center justify-center bg-slate-50 overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.25) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div ref={wrapRef} className="relative shadow-lg ring-1 ring-slate-200">
        <canvas ref={canvasElRef} />
        {/* 캔버스 하단 규격 표시 — 1차에서 일시 제거 (사용자 요청) */}
        {/* {item?.width_mm && item?.height_mm && (
          <div className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-slate-600 font-mono pointer-events-none">
            {item.width_mm} × {item.height_mm} mm{item.category ? ` · ${item.category}` : ''}
          </div>
        )} */}
      </div>

      {!item && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
              <path strokeLinecap="round" strokeWidth="1.5" d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">위 그리드에서 제작물을 선택하세요</p>
        </div>
      )}
    </div>
  )
}
