{
  "width": ${image.width},
  "height": ${image.height},
  "channels": ${image.channels},
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
