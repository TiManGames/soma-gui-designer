# SOMA GUI Designer - Phase 1.3 Prototype

Standalone browser prototype for visually composing SOMA/HPL3 ImGui layout chunks for map `OnGui` callbacks and terminal `OnGui` callbacks.

This version is **primitive-first**. The main workflow is no longer preset terminal-app generation. It is now a visual layout composer for custom screens/apps: windows, groups, buttons, images, text frames, gauges, and custom code blocks. It uses SOMA/StationGUI helper functions for default widget data instead of recreating those defaults manually.

## Run

Open:

```text
tools/soma-gui-designer-phase1/index.html
```

No install step is required.

## Core use case

Create a custom terminal screen visually, then copy the generated function into a map script or helper file.

Example desired generated structure:

```cpp
void DrawGeneratedCustomScreen(const tString&in asEntityName, float afTimeStep)
{
    ImGui_SetTransCategory("GeneratedTerminal");

    cImGuiWindowData mainWindowData = StationGui_CreateDefaultWindowData();
    StationGui_DoWindowStart(
        "MyWindowCaption",
        mainWindowData,
        ImGui_NrmPos(cVector3f(0.1, 0.1, 1)),
        ImGui_NrmSize(cVector2f(0.8, 0.72)),
        true
    );

        ImGui_DoImage(
            cImGuiGfx("my_image"),
            ImGui_NrmPosGroup(cVector3f(0.05, 0.1, 1)),
            ImGui_NrmSizeGroup(cVector2f(0.35, 0.45))
        );

        cImGuiTextFrameData bodyTextData = StationGui_CreateDefaultTextFrameData();
        ImGui_DoTextFrameExt(
            "MyTextEntry",
            0,
            0,
            0,
            bodyTextData,
            ImGui_NrmPosGroup(cVector3f(0.45, 0.1, 1)),
            ImGui_NrmSizeGroup(cVector2f(0.5, 0.55))
        );

        cImGuiButtonData confirmButtonData = StationGui_CreateDefaultButtonData();
        if (ImGui_DoButtonExt(
            "ConfirmButton",
            "Confirm",
            confirmButtonData,
            ImGui_NrmPosGroup(cVector3f(0.7, 0.85, 1)),
            ImGui_NrmSizeGroup(cVector2f(0.25, 0.1))
        ))
        {
            // TODO: ConfirmButton pressed
        }

    StationGui_DoWindowEnd();
}
```

## Current scope

The editor supports:

- Target selection:
  - Terminal callback: `void MyFunc(const tString&in asEntityName, float afTimeStep)`
  - Map/main callback: `void OnGui(float afTimeStep)`
- Translation category field.
- Common preview resolution presets:
  - 16:9
  - 16:10, including Steam Deck `1280x800`
  - ultrawide
  - legacy test ratios
  - custom
- “Use browser size” preview mode.
- Normalized layout:
  - `xN`, `yN`, `wN`, `hN`
  - preview resolution changes do not destroy layout
- Parent/child hierarchy:
  - root parent is `screen`
  - windows/groups can contain children
  - child elements use parent-relative coordinates
- Canvas selection, moving, resizing, duplicate, delete.
- HPS preview and copy-code workflow.
- Preload snippet preview.

## Palette

### Containers

- Station Window
- Group

### Elements

- Station Button
- Station Toggle Button
- Label
- Text Frame
- Image
- Gauge
- Fill / Frame
- Advanced custom HPS

### Optional helpers

- Numpad helper
- Text Reader helper

Preset apps such as mail/audio/full terminal menus are intentionally not the main workflow. They can be reintroduced later as optional helper blocks.

## Default data strategy

The generator calls the existing SOMA helper functions for defaults:

```cpp
StationGui_CreateDefaultWindowData()
StationGui_CreateDefaultButtonData()
StationGui_CreateToggleButtonData()
StationGui_CreateDefaultTextFrameData()
StationGui_CreateDefaultGaugeData()
```

It does **not** rebuild StationGUI defaults manually.

Customization is override-only. If the user enters overrides, the generator appends lines after the default-data call:

```cpp
cImGuiButtonData confirmButtonData = StationGui_CreateDefaultButtonData();
confirmButtonData.mFont.mvSize = ImGui_NrmSizeKeepRatio(0.035f);
confirmButtonData.mColorBase = gStationGuiColor_Warning;
```

## Settings overrides

Use one override per line:

```text
mFont.mvSize=ImGui_NrmSizeKeepRatio(0.035f)
mColorBase=gStationGuiColor_Warning
SetPadding(20,20,20,20)
```

Generated forms:

```cpp
confirmButtonData.mFont.mvSize = ImGui_NrmSizeKeepRatio(0.035f);
mainWindowData.SetPadding(20,20,20,20);
```

## Coordinate generation

Root/screen elements use:

```cpp
ImGui_NrmPos(...)
ImGui_NrmSize(...)
```

Children inside a `Station Window` or `Group` use:

```cpp
ImGui_NrmPosGroup(...)
ImGui_NrmSizeGroup(...)
```

This is the primary value of the tool: making nested ImGui layout and scaling easier.

## Internal schema direction

The internal document is schema version 3.

Important fields:

```json
{
  "id": "ConfirmButton",
  "type": "station-button",
  "parentId": "MainWindow",
  "xN": 0.7,
  "yN": 0.85,
  "wN": 0.25,
  "hN": 0.1,
  "z": 1,
  "caption": "Confirm",
  "settingsText": "mFont.mvSize=ImGui_NrmSizeKeepRatio(0.035f)"
}
```

The UI currently exposes parent ID as a text field. Future versions should provide drag/drop hierarchy editing.

## Known limitations

- The preview is structural, not a pixel-perfect SOMA renderer.
- Parent/child hierarchy exists but is still basic.
- No block-specific rich editors yet; many fields are still generic text fields.
- Image aspect ratio modes are not implemented yet.
- Generated code still needs manual gameplay logic, callbacks, sounds, entity names, and state transitions.
- Advanced users may still need to adjust code manually after export.

## Local SOMA source basis

The design is based on local usage and helper files:

- `maps/_e3/_e3_01_01/_e3_01_01.hps`
- `maps/_e3/_e3_01_02/_e3_01_02.hps`
- `maps/chapter04/04_03_tau_escape/04_03_tau_escape.hps`
- `maps/chapter05/05_02_ARK_inside/05_02_ARK_inside.hps`
- `maps/chapter00/00_03_laboratory/00_03_laboratory.hps`
- `script/custom_depth/helper_custom_depth_imgui/helper_imgui_station.hps`
- `script/custom_depth/helper_custom_depth_imgui/helper_imgui_station_basics.hps`
- `script/custom_depth/helper_custom_depth_imgui/helper_imgui_station_apps_common.hps`
- `script/custom_depth/helper_custom_depth_imgui/helper_custom_depth_imgui.hps`

## Next phase

Phase 1.4 should add:

- visual parent reassignment / drag into containers
- image aspect ratio modes
- per-component property panels
- raw label/button/image style presets
- reusable exported helper/app snippets