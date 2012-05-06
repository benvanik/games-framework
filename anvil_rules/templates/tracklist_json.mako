{
  "name": "${list.friendly_name}",
  "tracks": [
  % for i, track in enumerate(list.tracks):
    {
      "name": "${track.name}",
      "duration": ${track.duration},
      "dataSources": [
      % for j, source in enumerate(track.data_sources):
        {
          "type": "${source.type}",
          "path": "${source.path}",
          "size": ${source.size}
        % if j != len(track.data_sources) - 1:
        },
        % else:
        }
        % endif
      % endfor
      ]
    % if i != len(list.tracks) - 1:
    },
    % else:
    }
    % endif
  % endfor
  ]
}
