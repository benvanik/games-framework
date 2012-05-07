Before Code
================================================================================

* split readmes/setup/etc

* root
    * merge render/update frame
        * add 'hasFocus' to renderframe
    * idle detection (render)

* graphics
    * glsllib usage
    * texture binding stack/etc
    * dependent resources
        * this.addDependentResource(child)
        * auto restore whenever a dependent resource is restored
        * cube.Scene depends on program, etc
        * ensure calls to Resource.restore - base last
    * texture format/sampling/mip levels/etc
        * see what compressed textures would need

* binaryreader/writer (packetreader/writer)

Graphics
================================================================================

* graphicscontext detect() or something - see if supported and all extensions

* program needs 'requireExtension(name)'/etc
    * build task setting for required_extensions=[]

* Font base type:
    * BitmapFont

* TextureAtlas rewrite:
    * http://atlasgen.svn.sourceforge.net/viewvc/atlasgen/create_texture_atlas.py?revision=2&view=markup
    * https://github.com/operasoftware/TextureAtlas
    * http://omnisaurusgames.com/2011/06/texture-atlas-generation-using-python/

* DistanceFieldFont
    * https://github.com/zorbathut/glorp
    * https://github.com/zorbathut/glorp/blob/master/font_baker.cpp

* Add helper glsllib for gpgpu:
    * https://gist.github.com/1713774
    * other encoding/decoding math

Input
================================================================================

* updated mouse lock API
* mouse wheel on mac -- rate limit
    * goog.events.MouseWheelHandler
* mouse lock sensitivity/etc
* mouse lock center crosshair
* gamepad source
* accelerometer source
    * http://www.html5rocks.com/en/tutorials/device/orientation/
* action map
    * basic input actions (l/r/u/d, etc) with bindings
    * serialize/local storage
* mobile devices
    * touch input
    * on screen dpad/etc

Audio
================================================================================

* abstract backend
    * Web Audio API backend
    * Null backend
    * HTML5 Audio?
* directional audio
* instance pooling
* instance max playback count/etc
* handle audionode creation failure (can return null! change types to !!)
* tracks:
    * volume adjustment
    * stop/stopAll
    * cross-fade

Net
================================================================================

* clean disconnect on tab close (possible?)

* rate limiting SVC_RateLimit
* SV_RateMsec
* chat room cleanup on last user (flags for marking special channels?)

* detailed server logging
    * write to file/console/sink

* smooth RTT/latency
* gametime update ensure no negative/jumps via interpolation

* no-alloc packet reading (optional read-into)
* especially for state updates/etc

* download channel for big data (seperate http endpoint?)

* PacketWriter::writeString doesn't handle truncating UTF8 strings right
    * needs to truncate on byte count, not char count

* timer wraparound

* geoip: http://geoip.wtanaka.com/

IO
================================================================================

* node fs copyTo/moveTo
* better clean up of node fs temporary file systems

Closure
================================================================================

* merge changes back into Closure
    * goog.vec.Quaternion methods
    * goog.vec.Ray rewrite?
    * add !'s to Quaternion/Ray/etc

* externs: webaudio, mouselock, gamepad, fullscreen

* trimCanidatesUsingOnCost (in InlineFunctions.java) - could inline more
    * add an option for changing, inline math routines, @inline tag, etc

Performance
================================================================================

* octree value linked list for fast enum?
* octree
    * grow if needed (recursive growth)
        * remove maxCoord
    * 3D DDA
* gf.vec.Viewport.containsBoundingBox is SLOOWWWW

Debugging
================================================================================

* goog.debug.Trace to trace render/viz/collision/etc
* logging rewrite
    * gf.log, etc
    * web workers don't have console.log! need to proxy back to main thread
* shared worker error reporting
* goog.debug.catchErrors to catch all errors for logging/reporting
    * goog.debug.enhanceError to pretty exceptions

Misc
================================================================================

* cvars system
    * debug viz flag

* goog.vec.EPSILON where required

* shared net loader/etc (xmlhttprequestfactory)
    * priority art/sound/etc

* localization

* navigator.connection ('ethernet/wifi/2g/3g/etc')
    * use to select lod in asset loader
