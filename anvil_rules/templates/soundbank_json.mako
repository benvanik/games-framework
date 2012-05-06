{
  "name": "${bank.friendly_name}",
  "dataSources": [
  % for i, source in enumerate(bank.data_sources):
    {
      "type": "${source.type}",
      "path": "${source.path}",
      "size": ${source.size}
    % if i != len(bank.data_sources) - 1:
    },
    % else:
    }
    % endif
  % endfor
  ],
  "cues": [
  % for i, cue in enumerate(bank.cues):
    {
      "name": "${cue.name}",
      "playlist": [
      % for j, variant in enumerate(cue.playlist):
        {
          "start": ${variant.start},
          "duration": ${variant.duration}
        % if j != len(cue.playlist) - 1:
        },
        % else:
        }
        % endif
      % endfor
      ]
    % if i != len(bank.cues) -1:
    },
    % else:
    }
    % endif
  % endfor
  ]
}
