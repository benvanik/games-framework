{
  "width": ${image.width},
  "height": ${image.height},
  "channels": ${image.channels},
  % if image.slot_size:
  "slotSize": [${image.slot_size[0]}, ${image.slot_size[1]}],
  % endif
  "levelsOfDetail": [
  % for i, lod in enumerate(image.lod_list):
    [
    % for j, source in enumerate(lod):
      {
        "type": "${source.type}",
        "path": "${source.path}",
        "size": ${source.size}
      % if j != len(lod) - 1:
      },
      % else:
      }
      % endif
    % endfor
    % if i != len(image.lod_list) - 1:
    ],
    % else:
    ]
    % endif
  % endfor
  ]
}
