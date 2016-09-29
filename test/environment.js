var path = require('path')
var sinon = require('sinon')
var chai = require('chai')
var sinonChai = require('sinon-chai')

// Make requires relative to the src directory
var appModulePath = require('app-module-path')
appModulePath.addPath(path.join(__dirname, '..', 'src'))

chai.use(sinonChai)

global.chai = chai
global.sinon = sinon
global.expect = chai.expect
global.should = chai.should()
