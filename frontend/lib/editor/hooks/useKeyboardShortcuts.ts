"use client"

import { useEffect } from "react"
import { useDesignStore } from "@/lib/editor/state/store"

export function useKeyboardShortcuts() {
  const undo = useDesignStore((s) => s.undo)
  const redo = useDesignStore((s) => s.redo)
  const removeLayer = useDesignStore((s) => s.removeLayer)
  const selectedLayerIds = useDesignStore((s) => s.selectedLayerIds)
  const addLayer = useDesignStore((s) => s.addLayer)
  const setSelectedLayers = useDesignStore((s) => s.setSelectedLayers)
  const layers = useDesignStore((s) => s.layers)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey

      // Undo: Ctrl/Cmd + Z
      if (ctrlOrCmd && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((ctrlOrCmd && e.shiftKey && e.key === "z") || (ctrlOrCmd && e.key === "y")) {
        e.preventDefault()
        redo()
        return
      }

      // Save: Ctrl/Cmd + S
      if (ctrlOrCmd && e.key === "s") {
        e.preventDefault()
        // Trigger save - would need to expose save function
        const saveButton = document.querySelector('[aria-label*="Save"], [aria-label*="حفظ"]')
        if (saveButton instanceof HTMLElement) {
          saveButton.click()
        }
        return
      }

      // Copy: Ctrl/Cmd + C
      if (ctrlOrCmd && e.key === "c") {
        e.preventDefault()
        // @ts-ignore
        if (window.__editorDuplicateSelected) {
          // @ts-ignore
          window.__editorDuplicateSelected()
        }
        return
      }

      // Duplicate: Ctrl/Cmd + D
      if (ctrlOrCmd && e.key === "d") {
        e.preventDefault()
        selectedLayerIds.forEach((id) => {
          const layer = layers.find((l) => l.id === id)
          if (layer) {
            const newLayer = {
              ...layer,
              name: `${layer.name} Copy`,
              position: {
                x: layer.position.x + 20,
                y: layer.position.y + 20,
              },
            }
            addLayer(newLayer)
          }
        })
        return
      }

      // Delete: Delete or Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        selectedLayerIds.forEach((id) => removeLayer(id))
        setSelectedLayers([])
        return
      }

      // Select All: Ctrl/Cmd + A
      if (ctrlOrCmd && e.key === "a") {
        e.preventDefault()
        const faceLayers = layers.filter((l) => l.faceId === selectedFace)
        setSelectedLayers(faceLayers.map((l) => l.id))
        return
      }

      // Deselect: Escape
      if (e.key === "Escape") {
        e.preventDefault()
        setSelectedLayers([])
        return
      }

      // Tool shortcuts
      if (!ctrlOrCmd && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "v":
            e.preventDefault()
            useDesignStore.getState().setActiveTool("select")
            break
          case "t":
            e.preventDefault()
            useDesignStore.getState().setActiveTool("text")
            // @ts-ignore
            if (window.__editorAddText) window.__editorAddText()
            break
          case "i":
            e.preventDefault()
            useDesignStore.getState().setActiveTool("upload")
            // Trigger image upload
            const input = document.createElement("input")
            input.type = "file"
            input.accept = "image/*"
            input.onchange = (ev) => {
              const file = (ev.target as HTMLInputElement).files?.[0]
              if (file) {
                // @ts-ignore
                if (window.__editorAddImage) window.__editorAddImage(file)
              }
            }
            input.click()
            break
          case "r":
            e.preventDefault()
            useDesignStore.getState().setActiveTool("shape")
            // @ts-ignore
            if (window.__editorAddShape) window.__editorAddShape("rect")
            break
        }
      }

      // Arrow keys for moving selected layers
      if (selectedLayerIds.length > 0 && !ctrlOrCmd && !e.shiftKey) {
        const step = e.altKey ? 1 : 10 // Fine movement with Alt
        let moved = false

        switch (e.key) {
          case "ArrowLeft":
            e.preventDefault()
            selectedLayerIds.forEach((id) => {
              const layer = layers.find((l) => l.id === id)
              if (layer) {
                useDesignStore.getState().updateLayer(id, (l) => ({
                  ...l,
                  position: { ...l.position, x: l.position.x - step },
                }))
                moved = true
              }
            })
            break
          case "ArrowRight":
            e.preventDefault()
            selectedLayerIds.forEach((id) => {
              const layer = layers.find((l) => l.id === id)
              if (layer) {
                useDesignStore.getState().updateLayer(id, (l) => ({
                  ...l,
                  position: { ...l.position, x: l.position.x + step },
                }))
                moved = true
              }
            })
            break
          case "ArrowUp":
            e.preventDefault()
            selectedLayerIds.forEach((id) => {
              const layer = layers.find((l) => l.id === id)
              if (layer) {
                useDesignStore.getState().updateLayer(id, (l) => ({
                  ...l,
                  position: { ...l.position, y: l.position.y - step },
                }))
                moved = true
              }
            })
            break
          case "ArrowDown":
            e.preventDefault()
            selectedLayerIds.forEach((id) => {
              const layer = layers.find((l) => l.id === id)
              if (layer) {
                useDesignStore.getState().updateLayer(id, (l) => ({
                  ...l,
                  position: { ...l.position, y: l.position.y + step },
                }))
                moved = true
              }
            })
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [undo, redo, removeLayer, selectedLayerIds, addLayer, setSelectedLayers, layers, selectedFace])
}

